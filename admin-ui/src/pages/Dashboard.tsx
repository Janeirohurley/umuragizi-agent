import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Stats, AuditLog, UsageStats, SecurityEvent, AgentStatus, ServerInfo } from '../api';
import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { BarChart } from '../components/BarChart';
import { DonutChart } from '../components/DonutChart';
import { CopyButton } from '../components/CopyButton';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../contexts/ToastContext';

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [statsData, logsData, usageData, securityData, agentsData, serverData] = await Promise.all([
        api.getStats(),
        api.getAuditLogs(),
        api.getUsageStats(),
        api.getSecurityEvents(),
        api.getAgentsStatus(),
        api.getServerInfo(),
      ]);
      setStats(statsData);
      setLogs(logsData.logs);
      setUsage(usageData);
      setSecurityEvents(securityData.events);
      setAgents(agentsData.agents);
      setServerInfo(serverData);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement du dashboard';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePolling(fetchData, 15000);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-outline animate-pulse">Chargement...</div>
      </div>
    );
  }

  const chartData = (usage?.byTenant ?? []).slice(0, 6).map((t) => ({
    label: t.tenantNom.slice(0, 10),
    value: t.tokensIn + t.tokensOut,
    color: '#89ceff',
  }));

  const totalTokens = (usage?.totalTokensIn ?? 0) + (usage?.totalTokensOut ?? 0);
  const todayTokens = (usage?.todayTokensIn ?? 0) + (usage?.todayTokensOut ?? 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Overview Dashboard</h1>
          <p className="text-on-surface-variant text-sm mt-1">System-wide monitoring and resource telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-outline font-mono">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/tenants')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create Tenant
        </button>
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-high text-on-surface rounded-lg text-sm font-medium border border-outline-variant hover:bg-surface-highest transition-colors"
        >
          <span className="material-symbols-outlined text-lg">vpn_key</span>
          Generate Token
        </button>
        <button
          onClick={() => navigate('/agents')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-high text-on-surface rounded-lg text-sm font-medium border border-outline-variant hover:bg-surface-highest transition-colors"
        >
          <span className="material-symbols-outlined text-lg">psychology</span>
          Add Agent
        </button>
        <button
          onClick={() => navigate('/logs')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-high text-on-surface rounded-lg text-sm font-medium border border-outline-variant hover:bg-surface-highest transition-colors"
        >
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          View Logs
        </button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-6">
        <h3 className="text-on-surface font-medium mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">dns</span>
          Agent Server Endpoints
        </h3>
        {serverInfo ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-high/50 rounded-lg p-3">
              <p className="text-[10px] text-outline uppercase mb-1">Base URL</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-on-surface">{serverInfo.baseUrl}</span>
                <CopyButton value={serverInfo.baseUrl} />
              </div>
            </div>
            <div className="bg-surface-high/50 rounded-lg p-3">
              <p className="text-[10px] text-outline uppercase mb-1">Chat Endpoint</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-on-surface">{serverInfo.chatUrl}</span>
                <CopyButton value={serverInfo.chatUrl} />
              </div>
            </div>
            <div className="bg-surface-high/50 rounded-lg p-3">
              <p className="text-[10px] text-outline uppercase mb-1">Activate Endpoint</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-on-surface">{serverInfo.activateUrl}</span>
                <CopyButton value={serverInfo.activateUrl} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-outline text-sm">Chargement...</div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div onClick={() => navigate('/tenants')} className="cursor-pointer">
          <KPICard
            title="Tenants"
            value={stats?.totalTenants ?? 0}
            subtitle="Active organizations"
            trend={{ value: '+12 this month', positive: true }}
            icon="apartment"
            footer={
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>{stats?.totalTenants ?? 0} Total</span>
                <span>{stats?.activeDevices ?? 0} Active</span>
              </div>
            }
          />
        </div>
        <div onClick={() => navigate('/agents')} className="cursor-pointer">
          <KPICard
            title="Active Agents"
            value={agents.filter(a => a.status === 'active').length}
            subtitle="System nominal"
            icon="psychology"
            footer={
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>{agents.filter(a => a.status === 'active').length} Active</span>
                <span>{agents.filter(a => a.status === 'inactive').length} Inactive</span>
              </div>
            }
          />
        </div>
        <div onClick={() => navigate('/devices')} className="cursor-pointer">
          <KPICard
            title="Devices"
            value={(stats?.totalDevices ?? 0).toLocaleString()}
            subtitle="Real-time sync"
            icon="smartphone"
            footer={
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>{(stats?.activeDevices ?? 0).toLocaleString()} Activated</span>
                <span>{(stats?.activeDevices ?? 0).toLocaleString()} Online</span>
                <span>0 Blocked</span>
              </div>
            }
          />
        </div>
        <div onClick={() => navigate('/tokens')} className="cursor-pointer">
          <KPICard
            title="Tokens"
            value={(stats?.totalTokens ?? 0).toLocaleString()}
            subtitle="Quota tracking"
            icon="vpn_key"
            footer={
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Total Issued</span>
                <span>{(stats?.usedTokens ?? 0).toLocaleString()} Used</span>
                <span>{((stats?.totalTokens ?? 0) - (stats?.usedTokens ?? 0)).toLocaleString()} Avail</span>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-on-surface font-medium">AI Usage - Today</h3>
                <p className="text-on-surface-variant text-xs mt-1">
                  Total Tokens: {(totalTokens / 1000000).toFixed(2)}M | Today: {(todayTokens / 1000).toFixed(1)}k
                </p>
              </div>
              <DonutChart value={todayTokens} max={totalTokens || 1} label="Today" size={80} />
            </div>
            {chartData.length > 0 ? (
              <BarChart data={chartData} height={180} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-outline text-sm">
                No usage data yet
              </div>
            )}
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="text-on-surface font-medium">Recent Activity</h3>
              <button
                onClick={() => navigate('/logs')}
                className="text-primary text-sm hover:underline"
              >
                View All Logs
              </button>
            </div>
            <DataTable
              columns={[
                { key: 'deviceId', label: 'Device ID', render: (item) => <span className="font-mono text-xs">{item.deviceId}</span> },
                { key: 'tenantId', label: 'Tenant', render: (item) => <span className="font-mono text-xs">{item.tenantId}</span> },
                { key: 'timestamp', label: 'Time', render: (item) => new Date(item.timestamp).toLocaleString() },
                { key: 'action', label: 'Status', render: (item) => (
                  <StatusBadge
                    status={item.action === 'activation' ? 'active' : item.action === 'revocation' ? 'error' : 'info'}
                    label={item.action}
                  />
                )},
              ]}
              data={logs.slice(0, 5).map((log) => ({
                deviceId: log.deviceId ?? 'N/A',
                tenantId: log.tenantId ?? 'N/A',
                timestamp: log.timestamp,
                action: log.action,
              }))}
              emptyMessage="No recent activity"
            />
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
            <h3 className="text-on-surface font-medium mb-4 flex items-center justify-between">
              Security Monitor
              <button
                onClick={() => navigate('/security')}
                className="text-primary text-xs hover:underline"
              >
                View All
              </button>
            </h3>
            <div className="space-y-3">
              {securityEvents.length > 0 ? securityEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    event.type === 'success' ? 'bg-secondary' :
                    event.type === 'warning' ? 'bg-amber-400' :
                    event.type === 'error' ? 'bg-red-400' : 'bg-primary'
                  }`} />
                  <div>
                    <p className="text-xs text-on-surface">{event.message}</p>
                    <p className="text-[10px] text-outline mt-0.5">{timeAgo(event.timestamp)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-outline">No security events</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
            <h3 className="text-on-surface font-medium mb-4 flex items-center justify-between">
              Agents Status
              <button
                onClick={() => navigate('/agents')}
                className="text-primary text-xs hover:underline"
              >
                Manage
              </button>
            </h3>
            <div className="space-y-3">
              {agents.slice(0, 4).map((agent) => {
                const agentUsage = usage?.byAgent.find(a => a.agentId === agent.id);
                return (
                  <div key={agent.id} className="bg-surface-high/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-on-surface font-medium">{agent.name}</span>
                      <StatusBadge status={agent.status} label={agent.status === 'active' ? 'Active' : 'Inactive'} />
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-mono">{agent.model}</p>
                    <div className="flex justify-between mt-2 text-[10px] text-outline">
                      <span>{agentUsage?.count ?? 0} requests</span>
                      <span>{((agentUsage?.tokensIn ?? 0) + (agentUsage?.tokensOut ?? 0)).toLocaleString()} tokens</span>
                    </div>
                  </div>
                );
              })}
              {agents.length === 0 && (
                <p className="text-xs text-outline">No agents configured</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}