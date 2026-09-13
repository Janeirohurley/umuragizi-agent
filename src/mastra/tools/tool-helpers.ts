import { getTenantDb } from '../services/user-db';

export const TENANT_ID_KEY = 'tenantId' as const;

export async function getDbFromContext(context: any): Promise<{ db: any; tenantId: string }> {
  const tenantId = context?.requestContext?.get(TENANT_ID_KEY) as string | undefined;
  if (!tenantId) {
    throw new Error('tenantId non disponible. Authentification requise.');
  }
  const db = await getTenantDb(tenantId);
  return { db, tenantId };
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(d?: string): string {
  return d || new Date().toISOString().split('T')[0];
}

export function periodeToSqlDate(periode?: string): string {
  const now = new Date();
  switch (periode) {
    case 'semaine':
      now.setDate(now.getDate() - 7);
      break;
    case 'mois':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'trimestre':
      now.setMonth(now.getMonth() - 3);
      break;
    case 'annee':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString().split('T')[0];
}
