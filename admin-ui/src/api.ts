const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['x-admin-token'] = token;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }

  return data as T;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface AdminInfo {
  id: string;
  username: string;
}

export interface Tenant {
  id: string;
  nom: string;
  created_at: string;
}

export interface Stats {
  totalTenants: number;
  totalDevices: number;
  activeDevices: number;
  totalTokens: number;
  usedTokens: number;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  deviceId: string | null;
  action: string;
  details: string | null;
  timestamp: string;
}

export interface ActivationToken {
  token: string;
  statut: string;
  expiresAt: string;
  createdAt: string;
}

export interface Device {
  deviceId: string;
  statut: string;
  appVersion: string | null;
  lastUsed: string | null;
  createdAt: string;
}

export interface UsageStats {
  totalTokensIn: number;
  totalTokensOut: number;
  todayTokensIn: number;
  todayTokensOut: number;
  byTenant: Array<{ tenantId: string; tenantNom: string; tokensIn: number; tokensOut: number }>;
  byAgent: Array<{ agentId: string; tokensIn: number; tokensOut: number; count: number }>;
}

export interface SecurityEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  model: string;
  status: 'active' | 'inactive';
  tools: number;
}

export interface ServerInfo {
  baseUrl: string;
  chatUrl: string;
  activateUrl: string;
  refreshUrl: string;
  host: string;
  port: string;
  protocol: string;
}

export interface AmmpProvider {
  id: string;
  name: string;
  slug: string;
  base_url: string;
  auth_type: string;
  default_model: string | null;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AmmpAccount {
  id: string;
  provider_id: string;
  name: string;
  maskedKey?: string;
  apiKey?: string;
  org_id: string | null;
  quota_daily: number | null;
  quota_monthly: number | null;
  usage_daily: number;
  usage_monthly: number;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AmmpModel {
  id: string;
  provider_id: string;
  name: string;
  slug: string;
  full_id: string;
  display_name: string | null;
  context_window: number | null;
  max_output: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_streaming: boolean;
  cost_per_1k_input: number | null;
  cost_per_1k_output: number | null;
  enabled: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AmmpPool {
  id: string;
  name: string;
  description: string | null;
  strategy: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  models?: PoolModel[];
}

export interface PoolModel {
  id: string;
  pool_id: string;
  model_id: string;
  priority: number;
  weight: number;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

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

export interface ProviderHealth {
  id: string;
  provider_id: string;
  status: string;
  latency_ms: number | null;
  error_rate: number;
  last_check: string;
  consecutive_failures: number;
  cooldown_until: string | null;
  metadata: Record<string, unknown>;
}

export interface HealthCheckResult {
  providerId: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  error?: string;
}

export interface RoutingStatus {
  totalProviders: number;
  enabledProviders: number;
  totalAccounts: number;
  enabledAccounts: number;
  availableAccounts: number;
  totalModels: number;
  enabledModels: number;
  totalPools: number;
  activeCooldowns: number;
}

export interface RequestLog {
  id: string;
  tenant_id: string | null;
  provider_id: string;
  account_id: string;
  model_id: string;
  pool_id: string | null;
  status: string;
  latency_ms: number | null;
  tokens_in: number;
  tokens_out: number;
  cost: number;
  error_message: string | null;
  created_at: string;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/admin/logout', { method: 'POST' }),

  me: () => request<AdminInfo>('/admin/me'),

  getTenants: () =>
    request<{ tenants: Tenant[] }>('/admin/tenants'),

  createTenant: (nom: string) =>
    request<{ tenantId: string }>('/admin/tenants', {
      method: 'POST',
      body: JSON.stringify({ nom }),
    }),

  updateTenant: (tenantId: string, nom: string) =>
    request<{ success: boolean }>(`/admin/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify({ nom }),
    }),

  deleteTenant: (tenantId: string) =>
    request<{ success: boolean }>(`/admin/tenants/${tenantId}`, {
      method: 'DELETE',
    }),

  getStats: () =>
    request<Stats>('/admin/stats'),

  getAuditLogs: () =>
    request<{ logs: AuditLog[] }>('/admin/audit'),

  getTokens: (tenantId: string) =>
    request<{ tokens: ActivationToken[] }>(`/admin/tokens/${tenantId}`),

  createToken: (tenantId: string, expiresInDays?: number) =>
    request<{ token: string }>('/admin/tokens', {
      method: 'POST',
      body: JSON.stringify({ tenantId, expiresInDays }),
    }),

  revokeToken: (token: string) =>
    request<{ success: boolean }>('/admin/tokens/revoke', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  deleteToken: (token: string) =>
    request<{ success: boolean }>('/admin/tokens/delete', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getDevices: (tenantId: string) =>
    request<{ devices: Device[] }>(`/admin/devices/${tenantId}`),

  revokeDevice: (tenantId: string, deviceId: string) =>
    request<{ success: boolean }>('/admin/devices/revoke', {
      method: 'POST',
      body: JSON.stringify({ tenantId, deviceId }),
    }),

  getUsageStats: () =>
    request<UsageStats>('/admin/usage'),

  getSecurityEvents: () =>
    request<{ events: SecurityEvent[] }>('/admin/security'),

  getAgentsStatus: () =>
    request<{ agents: AgentStatus[] }>('/admin/agents'),

  getServerInfo: () =>
    request<ServerInfo>('/admin/server-info'),

  // ── AMMP Providers ──
  getProviders: () =>
    request<{ providers: AmmpProvider[] }>('/admin/ammp/providers'),

  createProvider: (data: { name: string; slug?: string; baseUrl: string; authType?: string; defaultModel?: string; enabled?: boolean; priority?: number }) =>
    request<AmmpProvider>('/admin/ammp/providers', { method: 'POST', body: JSON.stringify(data) }),

  updateProvider: (id: string, data: Partial<AmmpProvider>) =>
    request<AmmpProvider>(`/admin/ammp/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProvider: (id: string) =>
    request<{ success: boolean }>(`/admin/ammp/providers/${id}`, { method: 'DELETE' }),

  toggleProvider: (id: string, enabled: boolean) =>
    request<AmmpProvider>(`/admin/ammp/providers/${id}/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) }),

  // ── AMMP Accounts ──
  getAccounts: (providerId?: string) =>
    request<{ accounts: AmmpAccount[] }>(providerId ? `/admin/ammp/providers/${providerId}/accounts` : '/admin/ammp/accounts'),

  createAccount: (data: { providerId: string; name: string; apiKey: string; orgId?: string; quotaDaily?: number; quotaMonthly?: number; enabled?: boolean; priority?: number }) =>
    request<AmmpAccount>('/admin/ammp/accounts', { method: 'POST', body: JSON.stringify(data) }),

  updateAccount: (id: string, data: Partial<AmmpAccount & { apiKey?: string }>) =>
    request<AmmpAccount>(`/admin/ammp/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteAccount: (id: string) =>
    request<{ success: boolean }>(`/admin/ammp/accounts/${id}`, { method: 'DELETE' }),

  toggleAccount: (id: string, enabled: boolean) =>
    request<AmmpAccount>(`/admin/ammp/accounts/${id}/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) }),

  checkAccount: (id: string) =>
    request<{ available: boolean; reason?: string }>(`/admin/ammp/accounts/${id}/check`),

  // ── AMMP Models ──
  getModels: (providerId?: string) =>
    request<{ models: AmmpModel[] }>(providerId ? `/admin/ammp/models?providerId=${providerId}` : '/admin/ammp/models'),

  createModel: (data: { providerId: string; name: string; slug?: string; fullName?: string; displayName?: string; contextWindow?: number; maxOutput?: number; supportsVision?: boolean; supportsTools?: boolean; supportsStreaming?: boolean; costPer1kInput?: number; costPer1kOutput?: number; enabled?: boolean; tags?: string[] }) =>
    request<AmmpModel>('/admin/ammp/models', { method: 'POST', body: JSON.stringify(data) }),

  updateModel: (id: string, data: Partial<AmmpModel>) =>
    request<AmmpModel>(`/admin/ammp/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteModel: (id: string) =>
    request<{ success: boolean }>(`/admin/ammp/models/${id}`, { method: 'DELETE' }),

  toggleModel: (id: string, enabled: boolean) =>
    request<AmmpModel>(`/admin/ammp/models/${id}/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) }),

  // ── AMMP Pools ──
  getPools: () =>
    request<{ pools: AmmpPool[] }>('/admin/ammp/pools'),

  createPool: (data: { name: string; description?: string; strategy?: string; enabled?: boolean }) =>
    request<AmmpPool>('/admin/ammp/pools', { method: 'POST', body: JSON.stringify(data) }),

  getPool: (id: string) =>
    request<AmmpPool & { models: PoolModel[] }>(`/admin/ammp/pools/${id}`),

  updatePool: (id: string, data: Partial<AmmpPool>) =>
    request<AmmpPool>(`/admin/ammp/pools/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePool: (id: string) =>
    request<{ success: boolean }>(`/admin/ammp/pools/${id}`, { method: 'DELETE' }),

  addModelToPool: (poolId: string, data: { modelId: string; priority?: number; weight?: number }) =>
    request<PoolModel>(`/admin/ammp/pools/${poolId}/models`, { method: 'POST', body: JSON.stringify(data) }),

  removeModelFromPool: (poolId: string, modelId: string) =>
    request<{ success: boolean }>(`/admin/ammp/pools/${poolId}/models/${modelId}`, { method: 'DELETE' }),

  // ── AMMP Policies ──
  getPolicies: () =>
    request<{ policies: RoutingPolicy[] }>('/admin/ammp/policies'),

  createPolicy: (data: { name: string; description?: string; conditions?: RoutingCondition[]; action?: string; targetPoolId?: string; priority?: number; enabled?: boolean }) =>
    request<RoutingPolicy>('/admin/ammp/policies', { method: 'POST', body: JSON.stringify(data) }),

  updatePolicy: (id: string, data: Partial<RoutingPolicy>) =>
    request<RoutingPolicy>(`/admin/ammp/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePolicy: (id: string) =>
    request<{ success: boolean }>(`/admin/ammp/policies/${id}`, { method: 'DELETE' }),

  // ── AMMP Health & Routing ──
  getHealthAll: () =>
    request<{ health: ProviderHealth[] }>('/admin/ammp/health'),

  testProviderHealth: (providerId: string) =>
    request<HealthCheckResult>(`/admin/ammp/health/${providerId}/test`, { method: 'POST' }),

  clearCooldown: (providerId: string) =>
    request<{ success: boolean }>(`/admin/ammp/health/${providerId}/clear-cooldown`, { method: 'POST' }),

  getRoutingStatus: () =>
    request<RoutingStatus>('/admin/ammp/routing/status'),

  getRequestLogs: (limit?: number, providerId?: string) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (providerId) params.set('providerId', providerId);
    return request<{ logs: RequestLog[] }>(`/admin/ammp/logs?${params}`);
  },
};
