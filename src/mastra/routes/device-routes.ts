import {
  activateDevice,
  verifyRequest,
  refreshAccessToken,
  logUsage,
} from '../auth/device-auth';

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errRes(message: string, status = 500) {
  return jsonRes({ error: message }, status);
}

export async function handleActivate(context: any): Promise<Response> {
  try {
    const body = await context.req.json();
    const { token, publicKey, appVersion } = body;
    if (!token || !publicKey) return errRes('token et publicKey requis', 400);
    const result = await activateDevice(token, publicKey, appVersion);
    return jsonRes(result, 201);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleRefresh(context: any): Promise<Response> {
  try {
    const body = await context.req.json();
    const { refreshToken } = body;
    if (!refreshToken) return errRes('refreshToken requis', 400);
    const result = await refreshAccessToken(refreshToken);
    if (!result) return errRes('Refresh token invalide ou expiré', 401);
    return jsonRes(result);
  } catch (err: any) {
    return errRes(err.message, 400);
  }
}

export async function handleChat(context: any): Promise<Response> {
  const { umuragiziAgent } = await import('../agents/umuragizi-agent');
  const { TENANT_ID_KEY } = await import('../tools/tool-helpers');
  const { resolveModel, toMastraModelConfig } = await import('../services/ammp/model-resolver');
  const { recordSuccess, recordFailure } = await import('../services/ammp/routing-engine');

  const reqBody = await context.req.json().catch(() => null);
  try {
    if (!reqBody || !reqBody.messages || !Array.isArray(reqBody.messages) || reqBody.messages.length === 0) {
      return jsonRes({ error: 'messages requis (array non vide)' }, 400);
    }

    const { messages, tenantId, deviceId } = reqBody;
    const lastMsg = messages[messages.length - 1];
    const userMessage = typeof lastMsg === 'string'
      ? lastMsg
      : (lastMsg?.content ?? JSON.stringify(lastMsg));

    const requestContext = context.get('requestContext');
    const ammpTenantId = requestContext?.get?.(TENANT_ID_KEY) || tenantId;

    let resolved;
    try {
      resolved = await resolveModel({
        tenantId: ammpTenantId || undefined,
        requiresTools: true,
      });
    } catch (ammpErr: any) {
      return jsonRes({ error: `Aucun modèle disponible: ${ammpErr.message}` }, 503);
    }

    const modelConfig = toMastraModelConfig(resolved);
    const startTime = Date.now();

    let result;
    try {
      result = await umuragiziAgent.generate(userMessage, {
        requestContext,
        toolChoice: 'auto',
        maxSteps: 15,
        memory: {
          thread: deviceId || 'default',
          resource: tenantId || 'default',
        },
        model: modelConfig,
      });
    } catch (genErr: any) {
      const durationMs = Date.now() - startTime;
      const isQuota = genErr.message?.includes('429') || genErr.message?.includes('quota') || genErr.message?.includes('rate limit');
      recordFailure(resolved.accountId, genErr.message || 'unknown error', isQuota).catch(() => {});
      logUsage({
        tenantId: tenantId ?? null,
        deviceId: deviceId ?? null,
        agentId: 'umuragizi-agent',
        tokensIn: 0,
        tokensOut: 0,
        model: resolved.fullId,
        durationMs,
      }).catch(() => {});
      throw genErr;
    }

    const durationMs = Date.now() - startTime;
    const text = result.text ?? '';
    const usage = (result as any).usage;
    const tokensIn = usage?.promptTokens ?? usage?.input_tokens ?? 0;
    const tokensOut = usage?.completionTokens ?? usage?.output_tokens ?? 0;

    recordSuccess(resolved.accountId, durationMs, tokensIn, tokensOut).catch(() => {});

    logUsage({
      tenantId: tenantId ?? null,
      deviceId: deviceId ?? null,
      agentId: 'umuragizi-agent',
      tokensIn,
      tokensOut,
      model: resolved.fullId,
      durationMs,
    }).catch(() => {});

    return jsonRes({
      text,
      _ammp: {
        model: resolved.displayName || resolved.name,
        provider: resolved.providerSlug,
        pool: resolved.poolName,
      },
    });
  } catch (err: any) {
    return jsonRes({ error: err.message ?? 'Erreur interne' }, 500);
  }
}

export async function handleSyncPush(context: any): Promise<Response> {
  const { TENANT_ID_KEY } = await import('../tools/tool-helpers');
  try {
    const body = await context.req.json().catch(() => null);
    if (!body?.tables) return jsonRes({ error: 'tables requis' }, 400);

    const requestContext = context.get('requestContext');
    const tenantId = requestContext.get(TENANT_ID_KEY);
    if (!tenantId) return jsonRes({ error: 'tenantId requis' }, 400);

    const { pushChanges } = await import('../services/sync-service');
    const result = await pushChanges(tenantId, body);
    return jsonRes(result);
  } catch (err: any) {
    return jsonRes({ error: err.message ?? 'Erreur sync push' }, 500);
  }
}

export async function handleSyncPull(context: any): Promise<Response> {
  const { TENANT_ID_KEY } = await import('../tools/tool-helpers');
  try {
    const body = await context.req.json().catch(() => ({}));

    const requestContext = context.get('requestContext');
    const tenantId = requestContext.get(TENANT_ID_KEY);
    if (!tenantId) return jsonRes({ error: 'tenantId requis' }, 400);

    const { pullChanges } = await import('../services/sync-service');
    const result = await pullChanges(tenantId, body ?? {});
    return jsonRes(result);
  } catch (err: any) {
    return jsonRes({ error: err.message ?? 'Erreur sync pull' }, 500);
  }
}

export async function handleSyncStatus(context: any): Promise<Response> {
  const { TENANT_ID_KEY } = await import('../tools/tool-helpers');
  try {
    const requestContext = context.get('requestContext');
    const tenantId = requestContext.get(TENANT_ID_KEY);
    if (!tenantId) return jsonRes({ error: 'tenantId requis' }, 400);

    const { getSyncStatus } = await import('../services/sync-service');
    const result = await getSyncStatus(tenantId);
    return jsonRes(result);
  } catch (err: any) {
    return jsonRes({ error: err.message ?? 'Erreur sync status' }, 500);
  }
}

export async function verifyDeviceAuth(context: any): Promise<{ valid: boolean; tenantId?: string; error?: Response }> {
  const accessToken = context.req.header('x-access-token');
  const deviceId = context.req.header('x-device-id');
  const timestamp = context.req.header('x-timestamp');
  const nonce = context.req.header('x-nonce');
  const signature = context.req.header('x-signature');

  if (!accessToken || !deviceId || !timestamp || !nonce || !signature) {
    const missing = [];
    if (!accessToken) missing.push('x-access-token');
    if (!deviceId) missing.push('x-device-id');
    if (!timestamp) missing.push('x-timestamp');
    if (!nonce) missing.push('x-nonce');
    if (!signature) missing.push('x-signature');
    return { valid: false, error: errRes(`Headers d'authentification requis: ${missing.join(', ')}`, 401) };
  }

  try {
    const result = await verifyRequest(accessToken, deviceId, timestamp, nonce, signature);
    if (!result.valid) {
      return { valid: false, error: errRes(result.reason || 'Authentification invalide', 401) };
    }
    return { valid: true, tenantId: result.tenantId };
  } catch {
    return { valid: false, error: errRes('Erreur d\'authentification', 401) };
  }
}
