import {
  createProvider,
  getProvider,
  listProviders,
  updateProvider,
  deleteProvider,
  toggleProvider,
} from '../services/ammp/provider-service';
import {
  createModel,
  getModel,
  listModels,
  updateModel,
  deleteModel,
  toggleModel,
} from '../services/ammp/model-service';
import {
  createPool,
  getPool,
  listPools,
  updatePool,
  deletePool,
  addModelToPool,
  removeModelFromPool,
  listPoolModels,
  getPoolWithModels,
  togglePoolModel,
} from '../services/ammp/pool-service';
import {
  createPolicy,
  getPolicy,
  listPolicies,
  updatePolicy,
  deletePolicy,
  togglePolicy,
} from '../services/ammp/policy-service';
import {
  selectRoute,
  getRoutingStatus,
} from '../services/ammp/routing-engine';
import {
  testProviderConnection,
  getAllProviderHealth,
  getProviderHealth,
  clearProviderCooldown,
  getRequestLogs,
} from '../services/ammp/health-service';
import {
  createAccount,
  getAccountDecrypted,
  listAccountsWithMaskedKeys,
  updateAccount,
  deleteAccount,
  toggleAccount,
  isAccountAvailable,
} from '../services/ammp/account-service';
import { verifyAdminSession } from '../auth/admin-auth';

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errRes(message: string, status = 500) {
  return jsonRes({ error: message }, status);
}

async function requireAdmin(context: any): Promise<{ id: string; username: string } | Response> {
  const token = context.req.header('x-admin-token');
  if (!token) return errRes('Token admin requis', 401);
  const admin = await verifyAdminSession(token);
  if (!admin) return errRes('Session invalide', 401);
  return admin;
}

// ── Provider Routes ──

export async function handleAmmpProvidersList(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const providers = await listProviders();
    return jsonRes({ providers });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpProviderCreate(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { name, slug, baseUrl, authType, defaultModel, enabled, priority, config } = body;
    if (!name || !baseUrl) return errRes('name et baseUrl requis', 400);
    const provider = await createProvider({ name, slug, baseUrl, authType, defaultModel, enabled, priority, config });
    return jsonRes(provider, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpProviderGet(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const provider = await getProvider(id);
    if (!provider) return errRes('Provider introuvable', 404);
    return jsonRes(provider);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpProviderUpdate(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const provider = await updateProvider(id, body);
    if (!provider) return errRes('Provider introuvable', 404);
    return jsonRes(provider);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpProviderDelete(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const deleted = await deleteProvider(id);
    if (!deleted) return errRes('Provider introuvable', 404);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpProviderToggle(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { enabled } = body;
    if (enabled === undefined) return errRes('enabled requis', 400);
    const provider = await toggleProvider(id, enabled);
    if (!provider) return errRes('Provider introuvable', 404);
    return jsonRes(provider);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

// ── Account Routes ──

export async function handleAmmpAccountsList(context: any, providerId?: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const accounts = await listAccountsWithMaskedKeys(providerId);
    return jsonRes({ accounts });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpAccountCreate(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { providerId, name, apiKey, orgId, quotaDaily, quotaMonthly, enabled, priority, config } = body;
    if (!providerId || !name || !apiKey) return errRes('providerId, name et apiKey requis', 400);
    const account = await createAccount({ providerId, name, apiKey, orgId, quotaDaily, quotaMonthly, enabled, priority, config });
    return jsonRes(account, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpAccountGet(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const account = await getAccountDecrypted(id);
    if (!account) return errRes('Account introuvable', 404);
    return jsonRes(account);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpAccountUpdate(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const account = await updateAccount(id, body);
    if (!account) return errRes('Account introuvable', 404);
    return jsonRes(account);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpAccountDelete(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const deleted = await deleteAccount(id);
    if (!deleted) return errRes('Account introuvable', 404);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpAccountToggle(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { enabled } = body;
    if (enabled === undefined) return errRes('enabled requis', 400);
    const account = await toggleAccount(id, enabled);
    if (!account) return errRes('Account introuvable', 404);
    return jsonRes(account);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpAccountCheck(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const status = await isAccountAvailable(id);
    return jsonRes(status);
  } catch (err: any) {
    return errRes(err.message);
  }
}

// ── Model Routes ──

export async function handleAmmpModelsList(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const url = new URL(context.req.url);
    const providerId = url.searchParams.get('providerId') || undefined;
    const models = await listModels(providerId);
    return jsonRes({ models });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpModelCreate(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { providerId, name, slug, fullName, displayName, contextWindow, maxOutput, supportsVision, supportsTools, supportsStreaming, costPer1kInput, costPer1kOutput, enabled, tags, metadata } = body;
    if (!providerId || !name) return errRes('providerId et name requis', 400);
    const model = await createModel({ providerId, name, slug, fullName, displayName, contextWindow, maxOutput, supportsVision, supportsTools, supportsStreaming, costPer1kInput, costPer1kOutput, enabled, tags, metadata });
    return jsonRes(model, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpModelGet(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const model = await getModel(id);
    if (!model) return errRes('Model introuvable', 404);
    return jsonRes(model);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpModelUpdate(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const model = await updateModel(id, body);
    if (!model) return errRes('Model introuvable', 404);
    return jsonRes(model);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpModelDelete(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const deleted = await deleteModel(id);
    if (!deleted) return errRes('Model introuvable', 404);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpModelToggle(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { enabled } = body;
    if (enabled === undefined) return errRes('enabled requis', 400);
    const model = await toggleModel(id, enabled);
    if (!model) return errRes('Model introuvable', 404);
    return jsonRes(model);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

// ── Pool Routes ──

export async function handleAmmpPoolsList(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const pools = await listPools();
    return jsonRes({ pools });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpPoolCreate(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { name, description, strategy, enabled, config } = body;
    if (!name) return errRes('name requis', 400);
    const pool = await createPool({ name, description, strategy, enabled, config });
    return jsonRes(pool, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPoolGet(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const pool = await getPoolWithModels(id);
    if (!pool) return errRes('Pool introuvable', 404);
    return jsonRes(pool);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpPoolUpdate(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const pool = await updatePool(id, body);
    if (!pool) return errRes('Pool introuvable', 404);
    return jsonRes(pool);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPoolDelete(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const deleted = await deletePool(id);
    if (!deleted) return errRes('Pool introuvable', 404);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPoolAddModel(context: any, poolId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { modelId, priority, weight, enabled, config } = body;
    if (!modelId) return errRes('modelId requis', 400);
    const pm = await addModelToPool(poolId, { modelId, priority, weight, enabled, config });
    return jsonRes(pm, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPoolRemoveModel(context: any, poolId: string, modelId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const removed = await removeModelFromPool(poolId, modelId);
    if (!removed) return errRes('Model non trouvé dans le pool', 404);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPoolToggleModel(context: any, poolId: string, modelId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { enabled } = body;
    if (enabled === undefined) return errRes('enabled requis', 400);
    const pm = await togglePoolModel(poolId, modelId, enabled);
    if (!pm) return errRes('Model non trouvé dans le pool', 404);
    return jsonRes(pm);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

// ── Routing Policy Routes ──

export async function handleAmmpPoliciesList(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const policies = await listPolicies();
    return jsonRes({ policies });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpPolicyCreate(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { name, description, conditions, action, targetPoolId, priority, enabled } = body;
    if (!name) return errRes('name requis', 400);
    const policy = await createPolicy({ name, description, conditions, action, targetPoolId, priority, enabled });
    return jsonRes(policy, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPolicyGet(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const policy = await getPolicy(id);
    if (!policy) return errRes('Policy introuvable', 404);
    return jsonRes(policy);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpPolicyUpdate(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const policy = await updatePolicy(id, body);
    if (!policy) return errRes('Policy introuvable', 404);
    return jsonRes(policy);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPolicyDelete(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const deleted = await deletePolicy(id);
    if (!deleted) return errRes('Policy introuvable', 404);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAmmpPolicyToggle(context: any, id: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { enabled } = body;
    if (enabled === undefined) return errRes('enabled requis', 400);
    const policy = await togglePolicy(id, enabled);
    if (!policy) return errRes('Policy introuvable', 404);
    return jsonRes(policy);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

// ── Health Routes ──

export async function handleAmmpHealthAll(_context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(_context);
    if (admin instanceof Response) return admin;
    const health = await getAllProviderHealth();
    return jsonRes({ health });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpHealthProvider(context: any, providerId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const health = await getProviderHealth(providerId);
    return jsonRes(health ?? { status: 'unknown' });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpHealthTest(context: any, providerId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const result = await testProviderConnection(providerId);
    return jsonRes(result);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpHealthClearCooldown(context: any, providerId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    await clearProviderCooldown(providerId);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpLogs(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const url = new URL(context.req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const providerId = url.searchParams.get('providerId') || undefined;
    const logs = await getRequestLogs(limit, providerId);
    return jsonRes({ logs });
  } catch (err: any) {
    return errRes(err.message);
  }
}

// ── Routing Status ──

export async function handleAmmpRoutingStatus(_context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(_context);
    if (admin instanceof Response) return admin;
    const status = await getRoutingStatus();
    return jsonRes(status);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAmmpRoutingTest(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json().catch(() => ({}));
    const route = await selectRoute(body);
    return jsonRes({ route, found: !!route });
  } catch (err: any) {
    return errRes(err.message);
  }
}
