import { query } from '../../config/database';
import { isOnCooldown } from '../../config/redis';
import { decryptApiKey } from '../../config/encryption';

export interface ResolvedModel {
  modelId: string;
  fullId: string;
  name: string;
  displayName: string | null;
  providerSlug: string;
  providerBaseUrl: string;
  apiKey: string;
  orgId: string | null;
  accountId: string;
  accountName: string;
  poolId: string | null;
  poolName: string | null;
  contextWindow: number | null;
  supportsTools: boolean;
}

const FALLBACK_MODEL = process.env.AMMP_FALLBACK_MODEL || 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free';
const FALLBACK_BASE_URL = process.env.AMMP_FALLBACK_BASE_URL || 'https://openrouter.ai/api/v1';
const FALLBACK_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function resolveModel(context: {
  tenantId?: string;
  preferredPoolId?: string;
  requiresTools?: boolean;
  requiresVision?: boolean;
  minContextWindow?: number;
} = {}): Promise<ResolvedModel> {
  let candidateModels: any[] = [];

  if (context.preferredPoolId) {
    const poolModels = await query(
      `SELECT m.*, pm.priority as pool_priority, pm.weight,
              p.name as pool_name, p.id as pool_id
       FROM pool_models pm
       JOIN models m ON m.id = pm.model_id
       JOIN model_pools p ON p.id = pm.pool_id
       WHERE pm.pool_id = $1 AND pm.enabled = TRUE
         AND m.enabled = TRUE AND p.enabled = TRUE
       ORDER BY pm.priority DESC, pm.weight DESC`,
      [context.preferredPoolId]
    );
    candidateModels = poolModels.rows;
  } else {
    const allModels = await query(
      `SELECT m.*, 0 as pool_priority, 1 as weight,
              NULL as pool_name, NULL as pool_id
       FROM models m
       WHERE m.enabled = TRUE
       ORDER BY m.name`
    );
    candidateModels = allModels.rows;
  }

  if (context.requiresTools) {
    candidateModels = candidateModels.filter(m => m.supports_tools);
  }
  if (context.requiresVision) {
    candidateModels = candidateModels.filter(m => m.supports_vision);
  }
  if (context.minContextWindow) {
    candidateModels = candidateModels.filter(
      m => !m.context_window || m.context_window >= context.minContextWindow!
    );
  }

  candidateModels.sort((a: any, b: any) => (b.pool_priority || 0) - (a.pool_priority || 0));

  for (const model of candidateModels) {
    const accounts = await query(
      `SELECT pa.*, p.slug as provider_slug, p.base_url, p.default_model
       FROM provider_accounts pa
       JOIN providers p ON p.id = pa.provider_id
       WHERE pa.provider_id = $1 AND pa.enabled = TRUE AND p.enabled = TRUE
       ORDER BY pa.priority DESC`,
      [model.provider_id]
    );

    for (const account of accounts.rows) {
      const redisCooldown = await isOnCooldown(account.id);
      if (redisCooldown) continue;

      const now = new Date();
      const dailyReset = new Date(account.usage_reset_daily);
      const monthlyReset = new Date(account.usage_reset_monthly);
      let usageDaily = account.usage_daily;
      let usageMonthly = account.usage_monthly;

      if (now.toISOString().slice(0, 10) > dailyReset.toISOString().slice(0, 10)) {
        usageDaily = 0;
      }
      if (now.getFullYear() > monthlyReset.getFullYear() || now.getMonth() > monthlyReset.getMonth()) {
        usageMonthly = 0;
      }

      if (account.quota_daily !== null && usageDaily >= account.quota_daily) continue;
      if (account.quota_monthly !== null && usageMonthly >= account.quota_monthly) continue;

      if (account.cooldown_until) {
        const cooldownEnd = new Date(account.cooldown_until);
        if (cooldownEnd > now) continue;
        await query('UPDATE provider_accounts SET cooldown_until = NULL WHERE id = $1', [account.id]);
      }

      const apiKey = decryptApiKey(account.api_key_encrypted, account.api_key_iv, account.api_key_tag);

      return {
        modelId: model.id,
        fullId: model.full_id,
        name: model.name,
        displayName: model.display_name,
        providerSlug: account.provider_slug,
        providerBaseUrl: account.base_url,
        apiKey,
        orgId: account.org_id,
        accountId: account.id,
        accountName: account.name,
        poolId: model.pool_id,
        poolName: model.pool_name,
        contextWindow: model.context_window,
        supportsTools: model.supports_tools,
      };
    }
  }

  if (FALLBACK_API_KEY) {
    return {
      modelId: 'fallback',
      fullId: FALLBACK_MODEL,
      name: FALLBACK_MODEL.split('/').pop() || FALLBACK_MODEL,
      displayName: 'Fallback Model',
      providerSlug: FALLBACK_MODEL.split('/')[0],
      providerBaseUrl: FALLBACK_BASE_URL,
      apiKey: FALLBACK_API_KEY,
      orgId: null,
      accountId: '_fallback',
      accountName: 'Fallback',
      poolId: null,
      poolName: null,
      contextWindow: null,
      supportsTools: true,
    };
  }

  throw new Error('Aucun modèle disponible dans AMMP et pas de fallback configuré. Configurez OPENROUTER_API_KEY ou ajoutez un provider dans AMMP.');
}

export function toMastraModelConfig(resolved: ResolvedModel): { id: `${string}/${string}`; url: string; apiKey: string } {
  return {
    id: resolved.fullId as `${string}/${string}`,
    url: resolved.providerBaseUrl,
    apiKey: resolved.apiKey,
  };
}
