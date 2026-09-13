import {
  createTenant,
  createActivationToken,
  revokeDevice,
  listDevices,
  listTenants,
  listActivationTokens,
  revokeActivationToken,
  getStats,
  getAuditLogs,
  getUsageStats,
  getSecurityEvents,
  updateTenant,
  deleteTenant,
  deleteActivationToken,
} from '../auth/device-auth';
import {
  verifyAdmin,
  createAdminSession,
  verifyAdminSession,
  deleteAdminSession,
} from '../auth/admin-auth';

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

export async function handleAdminLogin(context: any): Promise<Response> {
  try {
    const body = await context.req.json();
    const { username, password } = body;
    if (!username || !password) return errRes('username et password requis', 400);
    const admin = await verifyAdmin(username, password);
    if (!admin) return errRes('Identifiants invalides', 401);
    const session = await createAdminSession(admin.id);
    return jsonRes({ token: session.token, expiresAt: session.expiresAt });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminLogout(context: any): Promise<Response> {
  try {
    const sessionToken = context.req.header('x-admin-token');
    if (sessionToken) await deleteAdminSession(sessionToken);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminMe(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    return jsonRes({ id: admin.id, username: admin.username });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminStats(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const stats = await getStats();
    return jsonRes(stats);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminAudit(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const logs = await getAuditLogs(50);
    return jsonRes({ logs });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminTenantsGet(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const tenants = await listTenants();
    return jsonRes({ tenants });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminTenantsPost(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { nom } = body;
    if (!nom) return errRes('nom requis', 400);
    const tenantId = await createTenant(nom);
    return jsonRes({ tenantId }, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminTenantPut(context: any, tenantId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { nom } = body;
    if (!nom) return errRes('nom requis', 400);
    await updateTenant(tenantId, nom);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminTenantDelete(context: any, tenantId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    await deleteTenant(tenantId);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminTokensPost(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { tenantId, expiresInDays } = body;
    if (!tenantId) return errRes('tenantId requis', 400);
    const token = await createActivationToken(tenantId, expiresInDays);
    return jsonRes({ token }, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminTokensGet(context: any, tenantId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const tokens = await listActivationTokens(tenantId);
    return jsonRes({ tokens });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminTokensRevoke(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { token } = body;
    if (!token) return errRes('token requis', 400);
    await revokeActivationToken(token);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminTokensDelete(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { token } = body;
    if (!token) return errRes('token requis', 400);
    await deleteActivationToken(token);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminDevicesGet(context: any, tenantId: string): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const devices = await listDevices(tenantId);
    return jsonRes({ devices });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminDevicesRevoke(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const body = await context.req.json();
    const { tenantId, deviceId } = body;
    if (!tenantId || !deviceId) return errRes('tenantId et deviceId requis', 400);
    await revokeDevice(tenantId, deviceId);
    return jsonRes({ success: true });
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleAdminUsage(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const usage = await getUsageStats();
    return jsonRes(usage);
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminSecurity(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const events = await getSecurityEvents(20);
    return jsonRes({ events });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminAgents(context: any): Promise<Response> {
  try {
    const admin = await requireAdmin(context);
    if (admin instanceof Response) return admin;
    const agents = [
      { id: 'umuragizi-agent', name: 'Umuragizi AI', model: 'meta-llama/llama-4-scout', status: 'active', tools: 27 },
      { id: 'weather-agent', name: 'Weather Agent', model: 'openai/gpt-5-mini', status: 'active', tools: 1 },
    ];
    return jsonRes({ agents });
  } catch (err: any) {
    return errRes(err.message);
  }
}

export async function handleAdminServerInfo(_context: any): Promise<Response> {
  try {
    const host = process.env.MASTRA_HOST || process.env.HOST || 'localhost';
    const port = process.env.MASTRA_PORT || process.env.PORT || '4111';
    const protocol = process.env.MASTRA_PROTOCOL || 'http';
    const baseUrl = `${protocol}://${host}:${port}`;
    return jsonRes({
      baseUrl,
      chatUrl: `${baseUrl}/api/chat`,
      activateUrl: `${baseUrl}/api/activate`,
      refreshUrl: `${baseUrl}/api/auth/refresh`,
      host,
      port,
      protocol,
    });
  } catch (err: any) {
    return errRes(err.message);
  }
}
