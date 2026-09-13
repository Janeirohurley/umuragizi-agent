import { query } from '../../config/database';
import { isOnCooldown, clearCooldown } from '../../config/redis';
import { decryptApiKey } from '../../config/encryption';
import { randomUUID } from 'node:crypto';

export interface ProviderHealth {
  id: string;
  provider_id: string;
  status: string;
  latency_ms: number | null;
  error_rate: number;
  last_check: string;
  consecutive_failures: number;
  cooldown_until: string | null;
  metadata: Record<string, unknown>;
}

export interface HealthCheckResult {
  providerId: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  error?: string;
}

export async function recordHealthCheck(providerId: string, status: string, latencyMs: number, metadata: Record<string, unknown> = {}): Promise<void> {
  const id = randomUUID();

  const existing = await query<ProviderHealth>(
    'SELECT * FROM provider_health WHERE provider_id = $1',
    [providerId]
  );

  if (existing.rows[0]) {
    const consecutiveFailures = status === 'down' ? existing.rows[0].consecutive_failures + 1 : 0;
    const cooldownUntil = consecutiveFailures >= 3
      ? new Date(Date.now() + 60000 * Math.min(consecutiveFailures, 10)).toISOString()
      : null;

    await query(
      `UPDATE provider_health SET
         status = $1, latency_ms = $2, last_check = NOW(),
         consecutive_failures = $3, cooldown_until = $4, metadata = $5
       WHERE provider_id = $6`,
      [status, latencyMs, consecutiveFailures, cooldownUntil, JSON.stringify(metadata), providerId]
    );
  } else {
    await query(
      `INSERT INTO provider_health (id, provider_id, status, latency_ms, consecutive_failures, metadata)
       VALUES ($1, $2, $3, $4, 0, $5)`,
      [id, providerId, status, latencyMs, JSON.stringify(metadata)]
    );
  }
}

export async function getProviderHealth(providerId: string): Promise<ProviderHealth | null> {
  const result = await query<ProviderHealth>(
    'SELECT * FROM provider_health WHERE provider_id = $1',
    [providerId]
  );
  return result.rows[0] ?? null;
}

export async function getAllProviderHealth(): Promise<ProviderHealth[]> {
  const result = await query<ProviderHealth>('SELECT * FROM provider_health ORDER BY provider_id');
  return result.rows;
}

export async function isProviderHealthy(providerId: string): Promise<{ healthy: boolean; reason?: string }> {
  // Check Redis cooldown
  const redisCooldown = await isOnCooldown(`provider:${providerId}`);
  if (redisCooldown) return { healthy: false, reason: 'Provider in cooldown (Redis)' };

  // Check DB health
  const health = await getProviderHealth(providerId);
  if (health) {
    if (health.cooldown_until) {
      const cooldownEnd = new Date(health.cooldown_until);
      if (cooldownEnd > new Date()) {
        return { healthy: false, reason: `Provider in cooldown until ${health.cooldown_until}` };
      }
      // Cooldown expired — clear it
      await query('UPDATE provider_health SET cooldown_until = NULL, consecutive_failures = 0 WHERE provider_id = $1', [providerId]);
    }
    if (health.status === 'down' && health.consecutive_failures >= 5) {
      return { healthy: false, reason: `Provider down (${health.consecutive_failures} consecutive failures)` };
    }
  }

  // Check provider enabled
  const provider = await query('SELECT enabled FROM providers WHERE id = $1', [providerId]);
  if (!provider.rows[0] || !provider.rows[0].enabled) {
    return { healthy: false, reason: 'Provider disabled' };
  }

  return { healthy: true };
}

export async function testProviderConnection(providerId: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const account = await query(
      `SELECT pa.api_key_encrypted, pa.api_key_iv, pa.api_key_tag, p.base_url, p.slug
       FROM provider_accounts pa
       JOIN providers p ON p.id = pa.provider_id
       WHERE pa.provider_id = $1 AND pa.enabled = TRUE AND p.enabled = TRUE
       ORDER BY pa.priority DESC LIMIT 1`,
      [providerId]
    );

    if (!account.rows[0]) {
      return { providerId, status: 'down', latencyMs: 0, error: 'No enabled accounts' };
    }

    const apiKey = decryptApiKey(account.rows[0].api_key_encrypted, account.rows[0].api_key_iv, account.rows[0].api_key_tag);
    const baseUrl = account.rows[0].base_url;
    const providerSlug = account.rows[0].slug;

    // Basic connectivity test — try to hit the models endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let url = `${baseUrl}/models`;
    if (providerSlug === 'openrouter') url = `${baseUrl}/api/v1/models`;
    if (providerSlug === 'openai') url = `${baseUrl}/v1/models`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      await recordHealthCheck(providerId, 'healthy', latencyMs);
      return { providerId, status: 'healthy', latencyMs };
    } else {
      const error = `HTTP ${response.status}`;
      await recordHealthCheck(providerId, 'down', latencyMs, { error });
      return { providerId, status: 'down', latencyMs, error };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const error = err.message || 'Connection failed';
    await recordHealthCheck(providerId, 'down', latencyMs, { error });
    return { providerId, status: 'down', latencyMs, error };
  }
}

export async function clearProviderCooldown(providerId: string): Promise<void> {
  await clearCooldown(`provider:${providerId}`);
  await query('UPDATE provider_health SET cooldown_until = NULL, consecutive_failures = 0 WHERE provider_id = $1', [providerId]);
}

export async function getRequestLogs(limit = 50, providerId?: string): Promise<any[]> {
  if (providerId) {
    const result = await query(
      `SELECT * FROM model_request_logs WHERE provider_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [providerId, limit]
    );
    return result.rows;
  }
  const result = await query(
    'SELECT * FROM model_request_logs ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}
