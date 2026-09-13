import { PostgresStore } from '@mastra/pg';
import { Pool, PoolClient } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Shared connection pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Mastra storage (memory, workflows, etc.)
export const mastraStorage = new PostgresStore({
  id: 'mastra-storage',
  pool,
});

// Get a client for transactions
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Execute a query with automatic client release
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

// Execute a transaction
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Initialize public schema tables (auth, admin, etc.)
export async function initPublicSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activation_tokens (
        token TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        statut TEXT DEFAULT 'non_utilise',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        public_key TEXT NOT NULL,
        activation_token TEXT,
        statut TEXT DEFAULT 'actif',
        app_version TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS access_tokens (
        token TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        device_id TEXT NOT NULL REFERENCES devices(device_id),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        device_id TEXT NOT NULL REFERENCES devices(device_id),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS used_nonces (
        nonce TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        device_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        device_id TEXT,
        agent_id TEXT NOT NULL,
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        model TEXT,
        duration_ms INTEGER DEFAULT 0,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL REFERENCES admins(id),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('[DB] Public schema initialized.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Create a tenant schema with all data tables
export async function createTenantSchema(tenantId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS "tenant_${tenantId}"`);

    const schema = `tenant_${tenantId}`;

    // Animals
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".animals (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        espece TEXT NOT NULL,
        race TEXT NOT NULL,
        sexe TEXT NOT NULL,
        date_naissance TEXT NOT NULL,
        photo_path TEXT,
        photo_base64 TEXT,
        identifiant TEXT NOT NULL,
        date_ajout TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        mere_id TEXT,
        pere_id TEXT,
        prix_achat REAL,
        statut TEXT DEFAULT 'Actif',
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Santes
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".santes (
        id TEXT PRIMARY KEY,
        animal_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        medicament TEXT,
        veterinaire TEXT,
        notes TEXT,
        cout REAL,
        est_paye INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Croissances
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".croissances (
        id TEXT PRIMARY KEY,
        animal_id TEXT NOT NULL,
        date TEXT NOT NULL,
        poids REAL NOT NULL,
        taille REAL,
        etat_physique TEXT,
        notes TEXT,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Alimentations
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".alimentations (
        id TEXT PRIMARY KEY,
        animal_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type_aliment TEXT NOT NULL,
        quantite REAL NOT NULL,
        unite TEXT NOT NULL,
        notes TEXT,
        prix_unitaire REAL,
        transaction_id TEXT,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Reproductions
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".reproductions (
        id TEXT PRIMARY KEY,
        animal_id TEXT NOT NULL,
        date_evenement TEXT NOT NULL,
        type_evenement TEXT NOT NULL,
        notes TEXT,
        date_prevue_mise_bas TEXT,
        partenaire_id TEXT,
        succes INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Productions
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".productions (
        id TEXT PRIMARY KEY,
        animal_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        quantite REAL NOT NULL,
        unite TEXT NOT NULL,
        prix_unitaire REAL,
        notes TEXT,
        transaction_id TEXT,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        montant REAL NOT NULL,
        date TEXT NOT NULL,
        categorie TEXT NOT NULL,
        animal_id TEXT,
        description TEXT,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Rappels
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".rappels (
        id TEXT PRIMARY KEY,
        animal_id TEXT NOT NULL,
        titre TEXT NOT NULL,
        description TEXT NOT NULL,
        date_rappel TEXT NOT NULL,
        type TEXT NOT NULL,
        est_complete INTEGER DEFAULT 0,
        date_completion TEXT,
        recurrent INTEGER DEFAULT 0,
        intervalle_jours INTEGER,
        intervalle_heures INTEGER,
        date_fin TEXT,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Genetic infos
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".genetic_infos (
        animal_id TEXT PRIMARY KEY,
        ebv REAL,
        inbreeding_coefficient REAL,
        last_calculated_at TEXT,
        version INTEGER DEFAULT 1,
        last_modified TIMESTAMPTZ DEFAULT NOW(),
        deleted BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query('COMMIT');
    console.log(`[DB] Tenant schema "${schema}" initialized.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Ensure tenant schema exists (create if not)
export async function ensureTenantSchema(tenantId: string): Promise<void> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)`,
    [`tenant_${tenantId}`]
  );

  if (!result.rows[0].exists) {
    await createTenantSchema(tenantId);
  }
}

// Close the pool
export async function closePool(): Promise<void> {
  await pool.end();
}
