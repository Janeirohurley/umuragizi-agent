import { pool, ensureTenantSchema } from '../config/database';

// Get a client with the tenant schema set
async function getTenantClient(tenantId: string) {
  await ensureTenantSchema(tenantId);
  const client = await pool.connect();
  await client.query(`SET search_path TO "tenant_${tenantId}"`);
  return client;
}

export async function getTenantDb(tenantId: string) {
  // Returns a client wrapper that automatically sets the schema
  await ensureTenantSchema(tenantId);
  return {
    async query(text: string, params?: any[]) {
      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO "tenant_${tenantId}"`);
        return await client.query(text, params);
      } finally {
        client.release();
      }
    }
  };
}
