import { query } from '../../config/database';
import { randomUUID } from 'node:crypto';

export interface Model {
  id: string;
  provider_id: string;
  name: string;
  slug: string;
  full_id: string;
  display_name: string | null;
  context_window: number | null;
  max_output: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_streaming: boolean;
  cost_per_1k_input: number | null;
  cost_per_1k_output: number | null;
  enabled: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateModelInput {
  providerId: string;
  name: string;
  slug?: string;
  fullName?: string;
  displayName?: string;
  contextWindow?: number;
  maxOutput?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  enabled?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateModelInput {
  name?: string;
  slug?: string;
  fullName?: string;
  displayName?: string;
  contextWindow?: number;
  maxOutput?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  enabled?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createModel(input: CreateModelInput): Promise<Model> {
  const id = randomUUID();
  const slug = input.slug || slugify(input.name);
  const fullName = input.fullName || `${input.providerId}/${input.name}`;
  const result = await query<Model>(
    `INSERT INTO models (id, provider_id, name, slug, full_id, display_name, context_window, max_output, supports_vision, supports_tools, supports_streaming, cost_per_1k_input, cost_per_1k_output, enabled, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [id, input.providerId, input.name, slug, fullName, input.displayName ?? null,
     input.contextWindow ?? null, input.maxOutput ?? null,
     input.supportsVision ?? false, input.supportsTools ?? false, input.supportsStreaming ?? true,
     input.costPer1kInput ?? null, input.costPer1kOutput ?? null,
     input.enabled ?? true, input.tags ?? [], JSON.stringify(input.metadata || {})]
  );
  return result.rows[0];
}

export async function getModel(id: string): Promise<Model | null> {
  const result = await query<Model>('SELECT * FROM models WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function listModels(providerId?: string, enabledOnly = false): Promise<Model[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (providerId) { conditions.push(`provider_id = $${i++}`); values.push(providerId); }
  if (enabledOnly) { conditions.push(`enabled = TRUE`); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query<Model>(`SELECT * FROM models ${where} ORDER BY provider_id, name ASC`, values);
  return result.rows;
}

export async function updateModel(id: string, input: UpdateModelInput): Promise<Model | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
  if (input.slug !== undefined) { fields.push(`slug = $${i++}`); values.push(input.slug); }
  if (input.fullName !== undefined) { fields.push(`full_id = $${i++}`); values.push(input.fullName); }
  if (input.displayName !== undefined) { fields.push(`display_name = $${i++}`); values.push(input.displayName); }
  if (input.contextWindow !== undefined) { fields.push(`context_window = $${i++}`); values.push(input.contextWindow); }
  if (input.maxOutput !== undefined) { fields.push(`max_output = $${i++}`); values.push(input.maxOutput); }
  if (input.supportsVision !== undefined) { fields.push(`supports_vision = $${i++}`); values.push(input.supportsVision); }
  if (input.supportsTools !== undefined) { fields.push(`supports_tools = $${i++}`); values.push(input.supportsTools); }
  if (input.supportsStreaming !== undefined) { fields.push(`supports_streaming = $${i++}`); values.push(input.supportsStreaming); }
  if (input.costPer1kInput !== undefined) { fields.push(`cost_per_1k_input = $${i++}`); values.push(input.costPer1kInput); }
  if (input.costPer1kOutput !== undefined) { fields.push(`cost_per_1k_output = $${i++}`); values.push(input.costPer1kOutput); }
  if (input.enabled !== undefined) { fields.push(`enabled = $${i++}`); values.push(input.enabled); }
  if (input.tags !== undefined) { fields.push(`tags = $${i++}`); values.push(input.tags); }
  if (input.metadata !== undefined) { fields.push(`metadata = $${i++}`); values.push(JSON.stringify(input.metadata)); }

  if (fields.length === 0) return getModel(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<Model>(
    `UPDATE models SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteModel(id: string): Promise<boolean> {
  const result = await query('DELETE FROM models WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function toggleModel(id: string, enabled: boolean): Promise<Model | null> {
  const result = await query<Model>(
    'UPDATE models SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [enabled, id]
  );
  return result.rows[0] ?? null;
}
