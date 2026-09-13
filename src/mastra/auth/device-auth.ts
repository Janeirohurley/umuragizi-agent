import { query, transaction } from '../config/database';
import { generateToken, hashToken, generateDeviceId, generateTenantId } from './token-utils';
import { createVerify } from 'crypto';

export async function initAuthDb(): Promise<void> {
  // Tables are now created by initPublicSchema() in database.ts
  console.log('[Auth] PostgreSQL schema ready.');
}

export async function createTenant(nom: string): Promise<string> {
  const tenantId = generateTenantId();

  await query(
    'INSERT INTO tenants (id, nom) VALUES ($1, $2)',
    [tenantId, nom]
  );

  return tenantId;
}

export async function createActivationToken(
  tenantId: string,
  expiresInDays: number = 365
): Promise<string> {
  const token = generateToken('tk');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  await query(
    'INSERT INTO activation_tokens (token, tenant_id, expires_at) VALUES ($1, $2, $3)',
    [token, tenantId, expiresAt]
  );

  return token;
}

export async function activateDevice(
  activationToken: string,
  publicKeyPem: string,
  appVersion?: string
): Promise<{
  deviceId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
}> {
  return await transaction(async (client) => {
    const tokenResult = await client.query(
      `SELECT * FROM activation_tokens 
       WHERE token = $1 AND statut = 'non_utilise'`,
      [activationToken]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Token d\'activation invalide ou déjà utilisé.');
    }

    const tokenRow = tokenResult.rows[0] as any;
    if (new Date(tokenRow.expires_at) < new Date()) {
      throw new Error('Token d\'activation expiré.');
    }

    const tenantId = tokenRow.tenant_id;
    const deviceId = generateDeviceId();

    await client.query(
      `INSERT INTO devices (device_id, tenant_id, public_key, activation_token, app_version)
       VALUES ($1, $2, $3, $4, $5)`,
      [deviceId, tenantId, publicKeyPem, activationToken, appVersion ?? null]
    );

    await client.query(
      `UPDATE activation_tokens SET statut = 'utilise' WHERE token = $1`,
      [activationToken]
    );

    const accessToken = generateToken('acc');
    const refreshToken = generateToken('ref');
    const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await client.query(
      `INSERT INTO access_tokens (token, tenant_id, device_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [accessToken, tenantId, deviceId, accessExpiresAt]
    );

    await client.query(
      `INSERT INTO refresh_tokens (token, tenant_id, device_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [refreshToken, tenantId, deviceId, refreshExpiresAt]
    );

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await client.query(
      `INSERT INTO audit_logs (id, tenant_id, device_id, action, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [logId, tenantId, deviceId, 'activation', 'Device activé avec token']
    );

    return { deviceId, tenantId, accessToken, refreshToken };
  });
}

export function verifySignature(
  publicKeyPem: string,
  data: string,
  signatureBase64: string
): boolean {
  try {
    const verify = createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch {
    return false;
  }
}

export async function verifyRequest(
  accessToken: string,
  deviceId: string,
  timestamp: string,
  nonce: string,
  signatureBase64: string
): Promise<{
  valid: boolean;
  tenantId?: string;
  reason?: string;
}> {
  const timestampMs = new Date(timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    return { valid: false, reason: 'Timestamp expiré (fenêtre de 5 minutes)' };
  }

  const nonceResult = await query<{ nonce: string }>(
    'SELECT nonce FROM used_nonces WHERE nonce = $1',
    [nonce]
  );
  if (nonceResult.rows.length > 0) {
    return { valid: false, reason: 'Nonce déjà utilisé (rejeu détecté)' };
  }

  const deviceResult = await query<{ device_id: string; public_key: string; tenant_id: string }>(
    `SELECT * FROM devices WHERE device_id = $1 AND statut = 'actif'`,
    [deviceId]
  );
  if (deviceResult.rows.length === 0) {
    return { valid: false, reason: 'Appareil introuvable ou révoqué' };
  }

  const device = deviceResult.rows[0] as any;

  const tokenResult = await query(
    `SELECT * FROM access_tokens 
     WHERE token = $1 AND device_id = $2 AND expires_at > NOW()`,
    [accessToken, deviceId]
  );
  if (tokenResult.rows.length === 0) {
    return { valid: false, reason: 'Access token invalide ou expiré' };
  }

  const dataToVerify = `${deviceId}|${timestamp}|${nonce}`;
  const signatureValid = verifySignature(device.public_key, dataToVerify, signatureBase64);
  if (!signatureValid) {
    return { valid: false, reason: 'Signature invalide' };
  }

  const nonceTtl = 10 * 60 * 1000;
  const nonceExpires = new Date(now + nonceTtl).toISOString();
  await query(
    'INSERT INTO used_nonces (nonce, expires_at) VALUES ($1, $2)',
    [nonce, nonceExpires]
  );

  await query(
    `UPDATE devices SET last_used_at = NOW() WHERE device_id = $1`,
    [deviceId]
  );

  return { valid: true, tenantId: device.tenant_id };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  return await transaction(async (client) => {
    const result = await client.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as any;

    await client.query(
      'DELETE FROM access_tokens WHERE device_id = $1',
      [row.device_id]
    );

    await client.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    const newAccessToken = generateToken('acc');
    const newRefreshToken = generateToken('ref');
    const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await client.query(
      `INSERT INTO access_tokens (token, tenant_id, device_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [newAccessToken, row.tenant_id, row.device_id, accessExpiresAt]
    );

    await client.query(
      `INSERT INTO refresh_tokens (token, tenant_id, device_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [newRefreshToken, row.tenant_id, row.device_id, refreshExpiresAt]
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });
}

export async function revokeDevice(tenantId: string, deviceId: string): Promise<void> {
  await query(
    `UPDATE devices SET statut = 'revoque' WHERE device_id = $1 AND tenant_id = $2`,
    [deviceId, tenantId]
  );
  await query(
    `DELETE FROM access_tokens WHERE device_id = $1 AND tenant_id = $2`,
    [deviceId, tenantId]
  );
  await query(
    `DELETE FROM refresh_tokens WHERE device_id = $1 AND tenant_id = $2`,
    [deviceId, tenantId]
  );
  await logAudit(tenantId, deviceId, 'revocation', `Device révoqué`);
}

export async function revokeActivationToken(token: string): Promise<void> {
  await query(
    `UPDATE activation_tokens SET statut = 'revoque' WHERE token = $1`,
    [token]
  );
}

export async function deleteActivationToken(token: string): Promise<void> {
  await query(
    `DELETE FROM activation_tokens WHERE token = $1`,
    [token]
  );
}

export async function updateTenant(tenantId: string, nom: string): Promise<void> {
  await query(
    `UPDATE tenants SET nom = $1 WHERE id = $2`,
    [nom, tenantId]
  );
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await query(`DELETE FROM access_tokens WHERE tenant_id = $1`, [tenantId]);
  await query(`DELETE FROM refresh_tokens WHERE tenant_id = $1`, [tenantId]);
  await query(`DELETE FROM devices WHERE tenant_id = $1`, [tenantId]);
  await query(`DELETE FROM activation_tokens WHERE tenant_id = $1`, [tenantId]);
  await query(`DELETE FROM usage_logs WHERE tenant_id = $1`, [tenantId]);
  await query(`UPDATE audit_logs SET tenant_id = NULL WHERE tenant_id = $1`, [tenantId]);
  await query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
}

export async function listDevices(tenantId: string): Promise<Array<{
  deviceId: string;
  statut: string;
  appVersion: string | null;
  lastUsed: string | null;
  createdAt: string;
}>> {
  const result = await query<{ device_id: string; statut: string; app_version: string | null; last_used_at: string | null; created_at: string }>(
    `SELECT device_id, statut, app_version, last_used_at, created_at 
     FROM devices WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );

  return result.rows.map((row) => ({
    deviceId: row.device_id,
    statut: row.statut,
    appVersion: row.app_version,
    lastUsed: row.last_used_at,
    createdAt: row.created_at,
  }));
}

export async function listActivationTokens(tenantId: string): Promise<Array<{
  token: string;
  statut: string;
  expiresAt: string;
  createdAt: string;
}>> {
  const result = await query<{ token: string; statut: string; expires_at: string; created_at: string }>(
    `SELECT token, statut, expires_at, created_at 
     FROM activation_tokens WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );

  return result.rows.map((row) => ({
    token: row.token,
    statut: row.statut,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function listTenants(): Promise<Array<{
  id: string;
  nom: string;
  createdAt: string;
}>> {
  const result = await query<{ id: string; nom: string; created_at: string }>(
    `SELECT id, nom, created_at FROM tenants ORDER BY created_at DESC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    nom: row.nom,
    createdAt: row.created_at,
  }));
}

async function logAudit(
  tenantId: string | null,
  deviceId: string | null,
  action: string,
  details: string
): Promise<void> {
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO audit_logs (id, tenant_id, device_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, tenantId, deviceId, action, details]
  );
}

export async function getStats(): Promise<{
  totalTenants: number;
  totalDevices: number;
  activeDevices: number;
  totalTokens: number;
  usedTokens: number;
}> {
  const tenantsResult = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM tenants');
  const devicesResult = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM devices');
  const activeDevicesResult = await query<{ count: string }>("SELECT COUNT(*)::text as count FROM devices WHERE statut = 'actif'");
  const tokensResult = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM activation_tokens');
  const usedTokensResult = await query<{ count: string }>("SELECT COUNT(*)::text as count FROM activation_tokens WHERE statut = 'utilise'");

  return {
    totalTenants: Number(tenantsResult.rows[0]?.count ?? 0),
    totalDevices: Number(devicesResult.rows[0]?.count ?? 0),
    activeDevices: Number(activeDevicesResult.rows[0]?.count ?? 0),
    totalTokens: Number(tokensResult.rows[0]?.count ?? 0),
    usedTokens: Number(usedTokensResult.rows[0]?.count ?? 0),
  };
}

export async function getAuditLogs(limit: number = 50): Promise<Array<{
  id: string;
  tenantId: string | null;
  deviceId: string | null;
  action: string;
  details: string | null;
  timestamp: string;
}>> {
  const result = await query<{ id: string; tenant_id: string | null; device_id: string | null; action: string; details: string | null; timestamp: string }>(
    `SELECT id, tenant_id, device_id, action, details, timestamp 
     FROM audit_logs ORDER BY timestamp DESC LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    deviceId: row.device_id,
    action: row.action,
    details: row.details,
    timestamp: row.timestamp,
  }));
}

export function getTenantDbPath(_tenantId: string): string {
  // No longer needed - using PostgreSQL schemas
  return 'postgresql';
}

export async function logUsage(data: {
  tenantId: string | null;
  deviceId: string | null;
  agentId: string;
  tokensIn: number;
  tokensOut: number;
  model?: string;
  durationMs?: number;
}): Promise<void> {
  const id = `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO usage_logs (id, tenant_id, device_id, agent_id, tokens_in, tokens_out, model, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      data.tenantId,
      data.deviceId,
      data.agentId,
      data.tokensIn,
      data.tokensOut,
      data.model ?? null,
      data.durationMs ?? 0,
    ]
  );
}

export async function getUsageStats(): Promise<{
  totalTokensIn: number;
  totalTokensOut: number;
  byTenant: Array<{ tenantId: string; tenantNom: string; tokensIn: number; tokensOut: number }>;
  byAgent: Array<{ agentId: string; tokensIn: number; tokensOut: number; count: number }>;
  todayTokensIn: number;
  todayTokensOut: number;
}> {
  const totalResult = await query<{ total_in: string; total_out: string }>(
    'SELECT COALESCE(SUM(tokens_in), 0)::text as total_in, COALESCE(SUM(tokens_out), 0)::text as total_out FROM usage_logs'
  );

  const todayResult = await query<{ total_in: string; total_out: string }>(
    `SELECT COALESCE(SUM(tokens_in), 0)::text as total_in, COALESCE(SUM(tokens_out), 0)::text as total_out 
     FROM usage_logs WHERE date(timestamp) = CURRENT_DATE`
  );

  const byTenantResult = await query<{ tenant_id: string; tenant_nom: string; tokens_in: string; tokens_out: string }>(
    `SELECT u.tenant_id, COALESCE(t.nom, 'Unknown') as tenant_nom,
     COALESCE(SUM(u.tokens_in), 0)::text as tokens_in, COALESCE(SUM(u.tokens_out), 0)::text as tokens_out
     FROM usage_logs u
     LEFT JOIN tenants t ON u.tenant_id = t.id
     GROUP BY u.tenant_id, t.nom
     ORDER BY SUM(u.tokens_in) + SUM(u.tokens_out) DESC`
  );

  const byAgentResult = await query<{ agent_id: string; tokens_in: string; tokens_out: string; count: string }>(
    `SELECT agent_id, COALESCE(SUM(tokens_in), 0)::text as tokens_in, 
     COALESCE(SUM(tokens_out), 0)::text as tokens_out, COUNT(*)::text as count
     FROM usage_logs
     GROUP BY agent_id
     ORDER BY SUM(tokens_in) + SUM(tokens_out) DESC`
  );

  return {
    totalTokensIn: Number(totalResult.rows[0]?.total_in ?? 0),
    totalTokensOut: Number(totalResult.rows[0]?.total_out ?? 0),
    todayTokensIn: Number(todayResult.rows[0]?.total_in ?? 0),
    todayTokensOut: Number(todayResult.rows[0]?.total_out ?? 0),
    byTenant: byTenantResult.rows.map((row) => ({
      tenantId: row.tenant_id,
      tenantNom: row.tenant_nom,
      tokensIn: Number(row.tokens_in),
      tokensOut: Number(row.tokens_out),
    })),
    byAgent: byAgentResult.rows.map((row) => ({
      agentId: row.agent_id,
      tokensIn: Number(row.tokens_in),
      tokensOut: Number(row.tokens_out),
      count: Number(row.count),
    })),
  };
}

export async function getSecurityEvents(limit: number = 10): Promise<Array<{
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}>> {
  const result = await query<{ id: string; action: string; details: string | null; tenant_id: string | null; device_id: string | null; timestamp: string }>(
    `SELECT id, action, details, tenant_id, device_id, timestamp 
     FROM audit_logs ORDER BY timestamp DESC LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => {
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';
    if (row.action === 'activation') type = 'success';
    else if (row.action === 'revocation') type = 'warning';
    else if (row.action.includes('fail') || row.action.includes('error')) type = 'error';

    const shortTenant = row.tenant_id ? row.tenant_id.slice(0, 12) + '...' : '';
    const shortDevice = row.device_id ? row.device_id.slice(0, 12) + '...' : '';

    let message = row.details || row.action;
    if (!row.details) {
      if (row.action === 'activation') message = `Device activated: ${shortDevice}`;
      else if (row.action === 'revocation') message = `Device revoked: ${shortDevice}`;
      else message = `${row.action}`;
    }

    return {
      id: row.id,
      type,
      message,
      timestamp: row.timestamp,
    };
  });
}
