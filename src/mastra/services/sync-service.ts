import { transaction, query, ensureTenantSchema } from '../config/database';

// All tenant data tables
const TABLES = [
  'animals', 'santes', 'croissances', 'alimentations',
  'reproductions', 'productions', 'transactions', 'rappels', 'genetic_infos',
] as const;

type TableName = typeof TABLES[number];

interface SyncRecord {
  id: string;
  version: number;
  lastModified: string;
  deleted: boolean;
  [key: string]: any;
}

interface PushPayload {
  tables: Partial<Record<TableName, SyncRecord[]>>;
}

interface PullPayload {
  since?: string; // ISO timestamp — return records modified after this
  tables?: TableName[]; // optional filter
}

interface SyncStatus {
  lastSyncAt: string | null;
  counts: Record<TableName, number>;
}

// ─── UPSERT A BATCH OF RECORDS INTO ONE TABLE ──────────────────────
async function upsertBatch(
  client: any,
  schema: string,
  table: TableName,
  records: SyncRecord[],
): Promise<{ inserted: number; updated: number; conflicts: number }> {
  if (records.length === 0) return { inserted: 0, updated: 0, conflicts: 0 };

  let inserted = 0;
  let updated = 0;
  let conflicts = 0;

  for (const rec of records) {
    // Fetch current server version
    const existing = await client.query(
      `SELECT version, last_modified, deleted FROM "${schema}"."${table}" WHERE id = $1`,
      [rec.id],
    );

    if (existing.rows.length === 0) {
      // Record doesn't exist → INSERT
      const cols = Object.keys(rec).filter(k => k !== 'version' && k !== 'last_modified' && k !== 'deleted');
      const vals = cols.map(c => rec[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`);

      await client.query(
        `INSERT INTO "${schema}"."${table}" (${cols.map(c => `"${c}"`).join(',')}, version, last_modified, deleted)
         VALUES (${placeholders.join(',')}, $${cols.length + 1}, NOW(), $${cols.length + 2})`,
        [...vals, rec.version ?? 1, rec.deleted ?? false],
      );
      inserted++;
    } else {
      const server = existing.rows[0];
      const serverVersion = server.version as number;

      // Conflict: same version but different data → server wins
      if (rec.version === serverVersion) {
        // Same version — check last_modified to break tie
        const clientTime = new Date(rec.lastModified).getTime();
        const serverTime = new Date(server.last_modified).getTime();
        if (clientTime <= serverTime) {
          conflicts++;
          continue;
        }
      }

      // Client version is newer → UPDATE
      if (rec.version > serverVersion) {
        const cols = Object.keys(rec).filter(k => k !== 'id' && k !== 'version' && k !== 'last_modified' && k !== 'deleted');
        const setClauses = cols.map((c, i) => `"${c}" = $${i + 1}`);
        const vals = cols.map(c => rec[c]);
        const idx = cols.length;

        await client.query(
          `UPDATE "${schema}"."${table}"
           SET ${setClauses.join(', ')}, version = $${idx + 1}, last_modified = NOW(), deleted = $${idx + 2}
           WHERE id = $${idx + 3} AND version < $${idx + 1}`,
          [...vals, rec.version, rec.deleted ?? false, rec.id],
        );
        updated++;
      }
      // else: client version < server version → ignore (server is newer)
    }
  }

  return { inserted, updated, conflicts };
}

// ─── PUSH: CLIENT SENDS LOCAL CHANGES TO SERVER ────────────────────
export async function pushChanges(
  tenantId: string,
  payload: PushPayload,
): Promise<{ results: Record<string, { inserted: number; updated: number; conflicts: number }>; serverTime: string }> {
  await ensureTenantSchema(tenantId);
  const schema = `tenant_${tenantId}`;

  const results: Record<string, { inserted: number; updated: number; conflicts: number }> = {};

  await transaction(async (client) => {
    // Set search path to tenant schema
    await client.query(`SET search_path TO "${schema}"`);

    for (const table of TABLES) {
      const records = payload.tables[table];
      if (!records || records.length === 0) continue;

      results[table] = await upsertBatch(client, schema, table, records);
    }
  });

  return { results, serverTime: new Date().toISOString() };
}

// ─── PULL: CLIENT GETS SERVER CHANGES SINCE TIMESTAMP ───────────────
export async function pullChanges(
  tenantId: string,
  payload: PullPayload,
): Promise<{ tables: Partial<Record<TableName, SyncRecord[]>>; serverTime: string }> {
  await ensureTenantSchema(tenantId);
  const schema = `tenant_${tenantId}`;
  const since = payload.since ?? '1970-01-01T00:00:00Z';
  const targetTables = payload.tables ?? [...TABLES];

  const result: Partial<Record<TableName, SyncRecord[]>> = {};

  for (const table of targetTables) {
    if (!TABLES.includes(table)) continue;

    const rows = await query<SyncRecord>(
      `SELECT * FROM "${schema}"."${table}" WHERE last_modified > $1 ORDER BY last_modified ASC`,
      [since],
    );

    result[table] = rows.rows;
  }

  return { tables: result, serverTime: new Date().toISOString() };
}

// ─── STATUS: GET SYNC STATUS ────────────────────────────────────────
export async function getSyncStatus(tenantId: string): Promise<SyncStatus> {
  await ensureTenantSchema(tenantId);
  const schema = `tenant_${tenantId}`;

  // Get the most recent last_modified across all tables
  let lastSyncAt: string | null = null;
  for (const table of TABLES) {
    const res = await query<{ max_modified: string | null }>(
      `SELECT MAX(last_modified) as max_modified FROM "${schema}"."${table}"`,
    );
    if (res.rows[0]?.max_modified) {
      const t = res.rows[0].max_modified;
      if (!lastSyncAt || t > lastSyncAt) {
        lastSyncAt = t;
      }
    }
  }

  // Count non-deleted records per table
  const counts = {} as Record<TableName, number>;
  for (const table of TABLES) {
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM "${schema}"."${table}" WHERE deleted = FALSE`,
    );
    counts[table] = parseInt(res.rows[0]?.count ?? '0', 10);
  }

  return { lastSyncAt, counts };
}
