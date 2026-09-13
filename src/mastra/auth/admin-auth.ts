import { query } from '../config/database';
import { scrypt, randomBytes, randomUUID } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return hash.toString('hex') === hashHex;
}

export async function initAdminTables(): Promise<void> {
  // Tables are now created by initPublicSchema() in database.ts
  console.log('[Admin] PostgreSQL schema ready.');
}

export async function ensureAdmin(username: string, password: string): Promise<void> {
  const existing = await query<{ id: string }>(
    'SELECT id FROM admins WHERE username = $1',
    [username]
  );

  if (existing.rows.length > 0) {
    return;
  }

  const id = `admin_${randomUUID()}`;
  const passwordHash = await hashPassword(password);

  await query(
    'INSERT INTO admins (id, username, password_hash) VALUES ($1, $2, $3)',
    [id, username, passwordHash]
  );

  console.log(`[Admin] Utilisateur "${username}" créé.`);
}

export async function verifyAdmin(
  username: string,
  password: string
): Promise<{ id: string; username: string } | null> {
  const result = await query<{ id: string; username: string; password_hash: string }>(
    'SELECT id, username, password_hash FROM admins WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const admin = result.rows[0] as any;
  const valid = await verifyPassword(password, admin.password_hash);

  if (!valid) {
    return null;
  }

  return { id: admin.id, username: admin.username };
}

export async function createAdminSession(adminId: string): Promise<{
  token: string;
  expiresAt: string;
}> {
  const token = `sess_${randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await query(
    'INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES ($1, $2, $3)',
    [token, adminId, expiresAt]
  );

  return { token, expiresAt };
}

export async function verifyAdminSession(
  token: string
): Promise<{ id: string; username: string } | null> {
  const result = await query<{ admin_id: string; username: string }>(
    `SELECT s.admin_id, a.username 
     FROM admin_sessions s 
     JOIN admins a ON s.admin_id = a.id 
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as any;
  return { id: row.admin_id, username: row.username };
}

export async function deleteAdminSession(token: string): Promise<void> {
  await query(
    'DELETE FROM admin_sessions WHERE token = $1',
    [token]
  );
}
