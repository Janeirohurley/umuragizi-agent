import { query } from '../../config/database';
import { randomUUID } from 'node:crypto';

export interface ModelPool {
  id: string;
  name: string;
  description: string | null;
  strategy: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PoolModel {
  id: string;
  pool_id: string;
  model_id: string;
  priority: number;
  weight: number;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface PoolWithModels extends ModelPool {
  models: PoolModel[];
}

export interface CreatePoolInput {
  name: string;
  description?: string;
  strategy?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface UpdatePoolInput {
  name?: string;
  description?: string;
  strategy?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface AddModelToPoolInput {
  modelId: string;
  priority?: number;
  weight?: number;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

// ── Pool CRUD ──

export async function createPool(input: CreatePoolInput): Promise<ModelPool> {
  const id = randomUUID();
  const result = await query<ModelPool>(
    `INSERT INTO model_pools (id, name, description, strategy, enabled, config)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.name, input.description ?? null, input.strategy || 'priority', input.enabled ?? true, JSON.stringify(input.config || {})]
  );
  return result.rows[0];
}

export async function getPool(id: string): Promise<ModelPool | null> {
  const result = await query<ModelPool>('SELECT * FROM model_pools WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function listPools(): Promise<ModelPool[]> {
  const result = await query<ModelPool>('SELECT * FROM model_pools ORDER BY name ASC');
  return result.rows;
}

export async function updatePool(id: string, input: UpdatePoolInput): Promise<ModelPool | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
  if (input.description !== undefined) { fields.push(`description = $${i++}`); values.push(input.description); }
  if (input.strategy !== undefined) { fields.push(`strategy = $${i++}`); values.push(input.strategy); }
  if (input.enabled !== undefined) { fields.push(`enabled = $${i++}`); values.push(input.enabled); }
  if (input.config !== undefined) { fields.push(`config = $${i++}`); values.push(JSON.stringify(input.config)); }

  if (fields.length === 0) return getPool(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<ModelPool>(
    `UPDATE model_pools SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deletePool(id: string): Promise<boolean> {
  const result = await query('DELETE FROM model_pools WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ── Pool Models (membership) ──

export async function addModelToPool(poolId: string, input: AddModelToPoolInput): Promise<PoolModel> {
  const id = randomUUID();
  const result = await query<PoolModel>(
    `INSERT INTO pool_models (id, pool_id, model_id, priority, weight, enabled, config)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (pool_id, model_id) DO UPDATE SET
       priority = EXCLUDED.priority,
       weight = EXCLUDED.weight,
       enabled = EXCLUDED.enabled,
       config = EXCLUDED.config
     RETURNING *`,
    [id, poolId, input.modelId, input.priority ?? 0, input.weight ?? 1, input.enabled ?? true, JSON.stringify(input.config || {})]
  );
  return result.rows[0];
}

export async function removeModelFromPool(poolId: string, modelId: string): Promise<boolean> {
  const result = await query('DELETE FROM pool_models WHERE pool_id = $1 AND model_id = $2', [poolId, modelId]);
  return (result.rowCount ?? 0) > 0;
}

export async function listPoolModels(poolId: string): Promise<PoolModel[]> {
  const result = await query<PoolModel>(
    'SELECT * FROM pool_models WHERE pool_id = $1 ORDER BY priority DESC, weight DESC',
    [poolId]
  );
  return result.rows;
}

export async function getPoolWithModels(poolId: string): Promise<PoolWithModels | null> {
  const pool = await getPool(poolId);
  if (!pool) return null;
  const models = await listPoolModels(poolId);
  return { ...pool, models };
}

export async function togglePoolModel(poolId: string, modelId: string, enabled: boolean): Promise<PoolModel | null> {
  const result = await query<PoolModel>(
    'UPDATE pool_models SET enabled = $1 WHERE pool_id = $2 AND model_id = $3 RETURNING *',
    [enabled, poolId, modelId]
  );
  return result.rows[0] ?? null;
}
