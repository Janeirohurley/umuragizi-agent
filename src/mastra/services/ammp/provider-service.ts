import { query } from '../../config/database';
import { randomUUID } from 'node:crypto';

export interface Provider {
  id: string;
  name: string;
  slug: string;
  base_url: string;
  auth_type: string;
  default_model: string | null;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateProviderInput {
  name: string;
  slug: string;
  baseUrl: string;
  authType?: string;
  defaultModel?: string;
  enabled?: boolean;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface UpdateProviderInput {
  name?: string;
  slug?: string;
  baseUrl?: string;
  authType?: string;
  defaultModel?: string;
  enabled?: boolean;
  priority?: number;
  config?: Record<string, unknown>;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createProvider(input: CreateProviderInput): Promise<Provider> {
  const id = randomUUID();
  const slug = input.slug || slugify(input.name);
  const result = await query<Provider>(
    `INSERT INTO providers (id, name, slug, base_url, auth_type, default_model, enabled, priority, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, input.name, slug, input.baseUrl, input.authType || 'api_key', input.defaultModel ?? null, input.enabled ?? true, input.priority ?? 0, JSON.stringify(input.config || {})]
  );
  return result.rows[0];
}

export async function getProvider(id: string): Promise<Provider | null> {
  const result = await query<Provider>('SELECT * FROM providers WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getProviderBySlug(slug: string): Promise<Provider | null> {
  const result = await query<Provider>('SELECT * FROM providers WHERE slug = $1', [slug]);
  return result.rows[0] ?? null;
}

export async function listProviders(enabledOnly = false): Promise<Provider[]> {
  const where = enabledOnly ? 'WHERE enabled = TRUE' : '';
  const result = await query<Provider>(`SELECT * FROM providers ${where} ORDER BY priority DESC, name ASC`);
  return result.rows;
}

export async function updateProvider(id: string, input: UpdateProviderInput): Promise<Provider | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
  if (input.slug !== undefined) { fields.push(`slug = $${i++}`); values.push(input.slug); }
  if (input.baseUrl !== undefined) { fields.push(`base_url = $${i++}`); values.push(input.baseUrl); }
  if (input.authType !== undefined) { fields.push(`auth_type = $${i++}`); values.push(input.authType); }
  if (input.defaultModel !== undefined) { fields.push(`default_model = $${i++}`); values.push(input.defaultModel); }
  if (input.enabled !== undefined) { fields.push(`enabled = $${i++}`); values.push(input.enabled); }
  if (input.priority !== undefined) { fields.push(`priority = $${i++}`); values.push(input.priority); }
  if (input.config !== undefined) { fields.push(`config = $${i++}`); values.push(JSON.stringify(input.config)); }

  if (fields.length === 0) return getProvider(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<Provider>(
    `UPDATE providers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteProvider(id: string): Promise<boolean> {
  const result = await query('DELETE FROM providers WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function toggleProvider(id: string, enabled: boolean): Promise<Provider | null> {
  const result = await query<Provider>(
    'UPDATE providers SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [enabled, id]
  );
  return result.rows[0] ?? null;
}
