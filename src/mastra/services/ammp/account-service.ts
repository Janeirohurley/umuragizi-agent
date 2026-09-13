import { query } from '../../config/database';
import { encryptApiKey, decryptApiKey } from '../../config/encryption';
import { randomUUID } from 'node:crypto';

export interface ProviderAccount {
  id: string;
  provider_id: string;
  name: string;
  api_key_encrypted: string;
  api_key_iv: string;
  api_key_tag: string;
  org_id: string | null;
  quota_daily: number | null;
  quota_monthly: number | null;
  usage_daily: number;
  usage_monthly: number;
  usage_reset_daily: string;
  usage_reset_monthly: string;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  providerId: string;
  name: string;
  apiKey: string;
  orgId?: string;
  quotaDaily?: number;
  quotaMonthly?: number;
  enabled?: boolean;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface UpdateAccountInput {
  name?: string;
  apiKey?: string;
  orgId?: string;
  quotaDaily?: number;
  quotaMonthly?: number;
  enabled?: boolean;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface AccountWithKey extends Omit<ProviderAccount, 'api_key_encrypted' | 'api_key_iv' | 'api_key_tag'> {
  apiKey?: string;
  maskedKey?: string;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
}

function resetIfNeeded(account: ProviderAccount): ProviderAccount {
  const now = new Date();
  const dailyReset = new Date(account.usage_reset_daily);
  const monthlyReset = new Date(account.usage_reset_monthly);
  const updated = { ...account };

  if (now.toISOString().slice(0, 10) > dailyReset.toISOString().slice(0, 10)) {
    updated.usage_daily = 0;
    updated.usage_reset_daily = now.toISOString();
  }
  if (now.getFullYear() > monthlyReset.getFullYear() || now.getMonth() > monthlyReset.getMonth()) {
    updated.usage_monthly = 0;
    updated.usage_reset_monthly = now.toISOString();
  }
  return updated;
}

export async function createAccount(input: CreateAccountInput): Promise<AccountWithKey> {
  const id = randomUUID();
  const { encrypted, iv, tag } = encryptApiKey(input.apiKey);
  const result = await query<ProviderAccount>(
    `INSERT INTO provider_accounts (id, provider_id, name, api_key_encrypted, api_key_iv, api_key_tag, org_id, quota_daily, quota_monthly, enabled, priority, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [id, input.providerId, input.name, encrypted, iv, tag, input.orgId ?? null, input.quotaDaily ?? null, input.quotaMonthly ?? null, input.enabled ?? true, input.priority ?? 0, JSON.stringify(input.config || {})]
  );
  const account = result.rows[0];
  return { ...account, maskedKey: maskApiKey(input.apiKey) };
}

export async function getAccount(id: string): Promise<ProviderAccount | null> {
  const result = await query<ProviderAccount>('SELECT * FROM provider_accounts WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getAccountDecrypted(id: string): Promise<AccountWithKey | null> {
  const account = await getAccount(id);
  if (!account) return null;
  const apiKey = decryptApiKey(account.api_key_encrypted, account.api_key_iv, account.api_key_tag);
  const reset = resetIfNeeded(account);
  return { ...reset, apiKey, maskedKey: maskApiKey(apiKey) };
}

export async function listAccounts(providerId?: string): Promise<ProviderAccount[]> {
  if (providerId) {
    const result = await query<ProviderAccount>(
      'SELECT * FROM provider_accounts WHERE provider_id = $1 ORDER BY priority DESC, name ASC',
      [providerId]
    );
    return result.rows.map(resetIfNeeded);
  }
  const result = await query<ProviderAccount>('SELECT * FROM provider_accounts ORDER BY priority DESC, name ASC');
  return result.rows.map(resetIfNeeded);
}

export async function listAccountsWithMaskedKeys(providerId?: string): Promise<AccountWithKey[]> {
  const accounts = await listAccounts(providerId);
  return accounts.map((a) => {
    const decrypted = decryptApiKey(a.api_key_encrypted, a.api_key_iv, a.api_key_tag);
    return { ...a, maskedKey: maskApiKey(decrypted) };
  });
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<AccountWithKey | null> {
  const existing = await getAccount(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
  if (input.orgId !== undefined) { fields.push(`org_id = $${i++}`); values.push(input.orgId); }
  if (input.quotaDaily !== undefined) { fields.push(`quota_daily = $${i++}`); values.push(input.quotaDaily); }
  if (input.quotaMonthly !== undefined) { fields.push(`quota_monthly = $${i++}`); values.push(input.quotaMonthly); }
  if (input.enabled !== undefined) { fields.push(`enabled = $${i++}`); values.push(input.enabled); }
  if (input.priority !== undefined) { fields.push(`priority = $${i++}`); values.push(input.priority); }
  if (input.config !== undefined) { fields.push(`config = $${i++}`); values.push(JSON.stringify(input.config)); }

  if (input.apiKey !== undefined) {
    const { encrypted, iv, tag } = encryptApiKey(input.apiKey);
    fields.push(`api_key_encrypted = $${i++}`, `api_key_iv = $${i++}`, `api_key_tag = $${i++}`);
    values.push(encrypted, iv, tag);
  }

  if (fields.length === 0) return getAccountDecrypted(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<ProviderAccount>(
    `UPDATE provider_accounts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!result.rows[0]) return null;
  const apiKey = decryptApiKey(result.rows[0].api_key_encrypted, result.rows[0].api_key_iv, result.rows[0].api_key_tag);
  return { ...result.rows[0], apiKey, maskedKey: maskApiKey(apiKey) };
}

export async function deleteAccount(id: string): Promise<boolean> {
  const result = await query('DELETE FROM provider_accounts WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function toggleAccount(id: string, enabled: boolean): Promise<ProviderAccount | null> {
  const result = await query<ProviderAccount>(
    'UPDATE provider_accounts SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [enabled, id]
  );
  return result.rows[0] ?? null;
}

export async function incrementUsage(accountId: string, tokensIn: number, tokensOut: number): Promise<void> {
  await query(
    `UPDATE provider_accounts SET
       usage_daily = usage_daily + 1,
       usage_monthly = usage_monthly + 1,
       updated_at = NOW()
     WHERE id = $1`,
    [accountId]
  );
}

export async function isAccountAvailable(id: string): Promise<{ available: boolean; reason?: string }> {
  const account = await getAccount(id);
  if (!account) return { available: false, reason: 'Account not found' };
  if (!account.enabled) return { available: false, reason: 'Account disabled' };
  const reset = resetIfNeeded(account);
  if (account.quota_daily !== null && reset.usage_daily >= account.quota_daily) {
    return { available: false, reason: 'Daily quota exceeded' };
  }
  if (account.quota_monthly !== null && reset.usage_monthly >= account.quota_monthly) {
    return { available: false, reason: 'Monthly quota exceeded' };
  }
  return { available: true };
}
