import { query } from '../../config/database';
import { randomUUID } from 'node:crypto';

export interface RoutingPolicy {
  id: string;
  name: string;
  description: string | null;
  conditions: RoutingCondition[];
  action: string;
  target_pool_id: string | null;
  priority: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutingCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface CreatePolicyInput {
  name: string;
  description?: string;
  conditions?: RoutingCondition[];
  action?: string;
  targetPoolId?: string;
  priority?: number;
  enabled?: boolean;
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string;
  conditions?: RoutingCondition[];
  action?: string;
  targetPoolId?: string;
  priority?: number;
  enabled?: boolean;
}

export async function createPolicy(input: CreatePolicyInput): Promise<RoutingPolicy> {
  const id = randomUUID();
  const result = await query<RoutingPolicy>(
    `INSERT INTO routing_policies (id, name, description, conditions, action, target_pool_id, priority, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, input.name, input.description ?? null, JSON.stringify(input.conditions || []), input.action || 'route', input.targetPoolId ?? null, input.priority ?? 0, input.enabled ?? true]
  );
  return result.rows[0];
}

export async function getPolicy(id: string): Promise<RoutingPolicy | null> {
  const result = await query<RoutingPolicy>('SELECT * FROM routing_policies WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function listPolicies(): Promise<RoutingPolicy[]> {
  const result = await query<RoutingPolicy>('SELECT * FROM routing_policies ORDER BY priority DESC, name ASC');
  return result.rows;
}

export async function updatePolicy(id: string, input: UpdatePolicyInput): Promise<RoutingPolicy | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
  if (input.description !== undefined) { fields.push(`description = $${i++}`); values.push(input.description); }
  if (input.conditions !== undefined) { fields.push(`conditions = $${i++}`); values.push(JSON.stringify(input.conditions)); }
  if (input.action !== undefined) { fields.push(`action = $${i++}`); values.push(input.action); }
  if (input.targetPoolId !== undefined) { fields.push(`target_pool_id = $${i++}`); values.push(input.targetPoolId); }
  if (input.priority !== undefined) { fields.push(`priority = $${i++}`); values.push(input.priority); }
  if (input.enabled !== undefined) { fields.push(`enabled = $${i++}`); values.push(input.enabled); }

  if (fields.length === 0) return getPolicy(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<RoutingPolicy>(
    `UPDATE routing_policies SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deletePolicy(id: string): Promise<boolean> {
  const result = await query('DELETE FROM routing_policies WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function togglePolicy(id: string, enabled: boolean): Promise<RoutingPolicy | null> {
  const result = await query<RoutingPolicy>(
    'UPDATE routing_policies SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [enabled, id]
  );
  return result.rows[0] ?? null;
}
