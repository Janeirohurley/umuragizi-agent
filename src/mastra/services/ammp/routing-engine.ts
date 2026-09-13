import { query } from '../../config/database';
import { isOnCooldown, setCooldown, clearCooldown, getCooldownTTL } from '../../config/redis';
import { decryptApiKey } from '../../config/encryption';
import { randomUUID } from 'node:crypto';

export interface RouteSelection {
  model: {
    id: string;
    name: string;
    full_id: string;
    provider_id: string;
    supports_tools: boolean;
    supports_vision: boolean;
    context_window: number | null;
    max_output: number | null;
  };
  account: {
    id: string;
    name: string;
    provider_id: string;
    apiKey: string;
    org_id: string | null;
  };
  pool: { id: string; name: string } | null;
  policy: { id: string; name: string } | null;
}

export interface RoutingContext {
  tenantId?: string;
  requiresTools?: boolean;
  requiresVision?: boolean;
  minContextWindow?: number;
  preferredPoolId?: string;
  preferredProviderId?: string;
}

export interface RouteAttempt {
  modelId: string;
  accountId: string;
  status: 'success' | 'failed' | 'cooldown' | 'quota_exceeded' | 'error';
  error?: string;
  latencyMs?: number;
}

const COOLDOWN_SECONDS = 60;

export async function selectRoute(ctx: RoutingContext = {}): Promise<RouteSelection | null> {
  // 1. Find candidate models via pool or direct
  let candidateModels: any[] = [];

  if (ctx.preferredPoolId) {
    const poolModels = await query(
      `SELECT m.*, pm.priority as pool_priority, pm.weight, p.name as pool_name, p.id as pool_id
       FROM pool_models pm
       JOIN models m ON m.id = pm.model_id
       JOIN model_pools p ON p.id = pm.pool_id
       WHERE pm.pool_id = $1 AND pm.enabled = TRUE AND m.enabled = TRUE AND p.enabled = TRUE
       ORDER BY pm.priority DESC, pm.weight DESC`,
      [ctx.preferredPoolId]
    );
    candidateModels = poolModels.rows;
  } else {
    // Get all enabled models
    const allModels = await query(
      `SELECT m.*, 0 as pool_priority, 1 as weight, NULL as pool_name, NULL as pool_id
       FROM models m
       WHERE m.enabled = TRUE
       ORDER BY m.name`
    );
    candidateModels = allModels.rows;
  }

  if (candidateModels.length === 0) return null;

  // 2. Filter by capabilities
  if (ctx.requiresTools) candidateModels = candidateModels.filter(m => m.supports_tools);
  if (ctx.requiresVision) candidateModels = candidateModels.filter(m => m.supports_vision);
  if (ctx.minContextWindow) candidateModels = candidateModels.filter(m => !m.context_window || m.context_window >= ctx.minContextWindow!);

  if (candidateModels.length === 0) return null;

  // 3. Sort by pool priority, then by model name
  candidateModels.sort((a: any, b: any) => (b.pool_priority || 0) - (a.pool_priority || 0));

  // 4. For each candidate model, find available account
  for (const model of candidateModels) {
    const accounts = await query(
      `SELECT pa.*, p.slug as provider_slug
       FROM provider_accounts pa
       JOIN providers p ON p.id = pa.provider_id
       WHERE pa.provider_id = $1 AND pa.enabled = TRUE AND p.enabled = TRUE
       ORDER BY pa.priority DESC`,
      [model.provider_id]
    );

    for (const account of accounts.rows) {
      // Check cooldown (Redis first, then DB fallback)
      const redisCooldown = await isOnCooldown(account.id);
      if (redisCooldown) continue;

      // Check quota
      const now = new Date();
      const dailyReset = new Date(account.usage_reset_daily);
      const monthlyReset = new Date(account.usage_reset_monthly);
      let usageDaily = account.usage_daily;
      let usageMonthly = account.usage_monthly;

      if (now.toISOString().slice(0, 10) > dailyReset.toISOString().slice(0, 10)) usageDaily = 0;
      if (now.getFullYear() > monthlyReset.getFullYear() || now.getMonth() > monthlyReset.getMonth()) usageMonthly = 0;

      if (account.quota_daily !== null && usageDaily >= account.quota_daily) continue;
      if (account.quota_monthly !== null && usageMonthly >= account.quota_monthly) continue;

      // Check DB cooldown
      if (account.cooldown_until) {
        const cooldownEnd = new Date(account.cooldown_until);
        if (cooldownEnd > now) continue;
        // Cooldown expired — clear it
        await query('UPDATE provider_accounts SET cooldown_until = NULL WHERE id = $1', [account.id]);
      }

      // Found a valid account — decrypt key and return
      const apiKey = decryptApiKey(account.api_key_encrypted, account.api_key_iv, account.api_key_tag);

      return {
        model: {
          id: model.id,
          name: model.name,
          full_id: model.full_id,
          provider_id: model.provider_id,
          supports_tools: model.supports_tools,
          supports_vision: model.supports_vision,
          context_window: model.context_window,
          max_output: model.max_output,
        },
        account: {
          id: account.id,
          name: account.name,
          provider_id: account.provider_id,
          apiKey,
          org_id: account.org_id,
        },
        pool: model.pool_id ? { id: model.pool_id, name: model.pool_name } : null,
        policy: null,
      };
    }
  }

  return null;
}

export async function recordSuccess(accountId: string, latencyMs: number, tokensIn: number, tokensOut: number): Promise<void> {
  await query(
    `UPDATE provider_accounts SET
       usage_daily = usage_daily + 1,
       usage_monthly = usage_monthly + 1,
       updated_at = NOW()
     WHERE id = $1`,
    [accountId]
  );

  // Log the request
  const modelResult = await query(
    `SELECT m.id as model_id, m.provider_id FROM provider_accounts pa JOIN models m ON m.provider_id = pa.provider_id WHERE pa.id = $1 LIMIT 1`,
    [accountId]
  );
  if (modelResult.rows[0]) {
    await query(
      `INSERT INTO model_request_logs (id, provider_id, account_id, model_id, status, latency_ms, tokens_in, tokens_out)
       VALUES ($1, $2, $3, $4, 'success', $5, $6, $7)`,
      [randomUUID(), modelResult.rows[0].provider_id, accountId, modelResult.rows[0].model_id, latencyMs, tokensIn, tokensOut]
    );
  }
}

export async function recordFailure(accountId: string, error: string, isQuota = false): Promise<void> {
  await query(
    `UPDATE provider_accounts SET
       usage_daily = usage_daily + 1,
       usage_monthly = usage_monthly + 1,
       updated_at = NOW()
     WHERE id = $1`,
    [accountId]
  );

  if (isQuota || error.includes('429') || error.includes('quota') || error.includes('rate limit')) {
    // Set cooldown
    await setCooldown(accountId, COOLDOWN_SECONDS);
    const cooldownUntil = new Date(Date.now() + COOLDOWN_SECONDS * 1000).toISOString();
    await query(
      `UPDATE provider_accounts SET cooldown_until = $1 WHERE id = $2`,
      [cooldownUntil, accountId]
    );
  }

  const modelResult = await query(
    `SELECT m.id as model_id, m.provider_id FROM provider_accounts pa JOIN models m ON m.provider_id = pa.provider_id WHERE pa.id = $1 LIMIT 1`,
    [accountId]
  );
  if (modelResult.rows[0]) {
    await query(
      `INSERT INTO model_request_logs (id, provider_id, account_id, model_id, status, error_message)
       VALUES ($1, $2, $3, $4, 'failed', $5)`,
      [randomUUID(), modelResult.rows[0].provider_id, accountId, modelResult.rows[0].model_id, error.substring(0, 500)]
    );
  }
}

export async function getRoutingStatus(): Promise<{
  totalProviders: number;
  enabledProviders: number;
  totalAccounts: number;
  enabledAccounts: number;
  availableAccounts: number;
  totalModels: number;
  enabledModels: number;
  totalPools: number;
  activeCooldowns: number;
}> {
  const [providers, accounts, models, pools, cooldowns] = await Promise.all([
    query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE enabled) as enabled FROM providers'),
    query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE enabled) as enabled FROM provider_accounts'),
    query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE enabled) as enabled FROM models'),
    query('SELECT COUNT(*) as total FROM model_pools WHERE enabled = TRUE'),
    query('SELECT COUNT(*) as total FROM provider_accounts WHERE cooldown_until > NOW()'),
  ]);

  const totalAccounts = parseInt(accounts.rows[0].total);
  const redisCooldowns = await getActiveCooldownsCount();

  return {
    totalProviders: parseInt(providers.rows[0].total),
    enabledProviders: parseInt(providers.rows[0].enabled),
    totalAccounts,
    enabledAccounts: parseInt(accounts.rows[0].enabled),
    availableAccounts: totalAccounts - parseInt(cooldowns.rows[0].total),
    totalModels: parseInt(models.rows[0].total),
    enabledModels: parseInt(models.rows[0].enabled),
    totalPools: parseInt(pools.rows[0].total),
    activeCooldowns: parseInt(cooldowns.rows[0].total) + redisCooldowns,
  };
}

async function getActiveCooldownsCount(): Promise<number> {
  try {
    const { getRedis } = await import('../../config/redis');
    const redis = getRedis();
    if (!redis) return 0;
    const keys = await redis.keys('ammp:cooldown:*');
    return keys.length;
  } catch {
    return 0;
  }
}
