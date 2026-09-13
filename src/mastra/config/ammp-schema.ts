import { pool } from './database';

export async function initAmmpSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        auth_type TEXT NOT NULL DEFAULT 'api_key',
        default_model TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        priority INTEGER DEFAULT 0,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_accounts (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        api_key_encrypted TEXT NOT NULL,
        api_key_iv TEXT NOT NULL,
        api_key_tag TEXT NOT NULL,
        org_id TEXT,
        quota_daily INTEGER,
        quota_monthly INTEGER,
        usage_daily INTEGER DEFAULT 0,
        usage_monthly INTEGER DEFAULT 0,
        usage_reset_daily TIMESTAMPTZ DEFAULT NOW(),
        usage_reset_monthly TIMESTAMPTZ DEFAULT NOW(),
        enabled BOOLEAN DEFAULT TRUE,
        priority INTEGER DEFAULT 0,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        full_id TEXT NOT NULL,
        display_name TEXT,
        context_window INTEGER,
        max_output INTEGER,
        supports_vision BOOLEAN DEFAULT FALSE,
        supports_tools BOOLEAN DEFAULT FALSE,
        supports_streaming BOOLEAN DEFAULT TRUE,
        cost_per_1k_input REAL,
        cost_per_1k_output REAL,
        enabled BOOLEAN DEFAULT TRUE,
        tags TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider_id, slug)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS model_pools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        strategy TEXT NOT NULL DEFAULT 'priority',
        enabled BOOLEAN DEFAULT TRUE,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pool_models (
        id TEXT PRIMARY KEY,
        pool_id TEXT NOT NULL REFERENCES model_pools(id) ON DELETE CASCADE,
        model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
        priority INTEGER DEFAULT 0,
        weight INTEGER DEFAULT 1,
        enabled BOOLEAN DEFAULT TRUE,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(pool_id, model_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS routing_policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        conditions JSONB NOT NULL DEFAULT '[]',
        action TEXT NOT NULL DEFAULT 'route',
        target_pool_id TEXT REFERENCES model_pools(id) ON DELETE SET NULL,
        priority INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_health (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'unknown',
        latency_ms INTEGER,
        error_rate REAL DEFAULT 0,
        last_check TIMESTAMPTZ DEFAULT NOW(),
        consecutive_failures INTEGER DEFAULT 0,
        cooldown_until TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS model_request_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        device_id TEXT,
        provider_id TEXT NOT NULL REFERENCES providers(id),
        account_id TEXT NOT NULL REFERENCES provider_accounts(id),
        model_id TEXT NOT NULL REFERENCES models(id),
        pool_id TEXT,
        status TEXT NOT NULL,
        latency_ms INTEGER,
        tokens_in INTEGER DEFAULT 0,
        tokens_out INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider ON provider_accounts(provider_id);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
      CREATE INDEX IF NOT EXISTS idx_pool_models_pool ON pool_models(pool_id);
      CREATE INDEX IF NOT EXISTS idx_pool_models_model ON pool_models(model_id);
      CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health(provider_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_tenant ON model_request_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_provider ON model_request_logs(provider_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_created ON model_request_logs(created_at);
    `);

    await client.query('COMMIT');
    console.log('[AMMP] Schema initialized.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
