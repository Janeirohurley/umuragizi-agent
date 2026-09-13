import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { UsageStats } from '../api';
import { KPICard } from '../components/KPICard';
import { usePolling } from '../hooks/usePolling';

export function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'tenants'>('overview');

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getUsageStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch {
      // API may not be ready yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePolling(fetchData, 30000);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-outline animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-on-surface">Usage</h1>
          <p className="text-on-surface-variant text-sm mt-1">Track API consumption, token usage, and request metrics.</p>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-outline text-5xl mb-3">bar_chart</span>
          <p className="text-on-surface-variant text-sm">Aucune donnée d'usage disponible</p>
          <p className="text-outline text-xs mt-1">Les statistiques apparaîtront après les premières requêtes.</p>
        </div>
      </div>
    );
  }

  const totalTokens = stats.totalTokensIn + stats.totalTokensOut;
  const totalAgentRequests = stats.byAgent.reduce((sum, a) => sum + a.count, 0);
  const ratio = stats.totalTokensOut > 0
    ? (stats.totalTokensIn / stats.totalTokensOut).toFixed(1)
    : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Usage</h1>
          <p className="text-on-surface-variant text-sm mt-1">Track API consumption, token usage, and request metrics.</p>
          <span className="text-[10px] text-outline font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Tokens In (total)"
          value={formatTokens(stats.totalTokensIn)}
          subtitle="Input tokens cumulés"
          icon="arrow_downward"
        />
        <KPICard
          title="Tokens Out (total)"
          value={formatTokens(stats.totalTokensOut)}
          subtitle="Output tokens cumulés"
          icon="arrow_upward"
        />
        <KPICard
          title="Tokens In (today)"
          value={formatTokens(stats.todayTokensIn)}
          subtitle="Depuis minuit"
          icon="today"
        />
        <KPICard
          title="Tokens Out (today)"
          value={formatTokens(stats.todayTokensOut)}
          subtitle="Depuis minuit"
          icon="calendar_month"
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-surface-high rounded-lg p-1 w-fit">
        {([
          ['overview', 'Vue Globale', 'bar_chart'],
          ['agents', 'Par Agent', 'psychology'],
          ['tenants', 'Par Tenant', 'apartment'],
        ] as const).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === key
                ? 'bg-surface-container text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          stats={stats}
          totalTokens={totalTokens}
          totalAgentRequests={totalAgentRequests}
          ratio={ratio}
        />
      )}
      {activeTab === 'agents' && (
        <AgentsTab byAgent={stats.byAgent} totalTokens={totalTokens} />
      )}
      {activeTab === 'tenants' && (
        <TenantsTab byTenant={stats.byTenant} totalTokens={totalTokens} />
      )}
    </div>
  );
}

// ── Tab: Overview ────────────────────────────────────

function OverviewTab({ stats, totalTokens, totalAgentRequests, ratio }: {
  stats: UsageStats;
  totalTokens: number;
  totalAgentRequests: number;
  ratio: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Token split */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
        <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-secondary">token</span>
          Répartition Tokens
        </h3>
        {totalTokens > 0 ? (
          <div className="space-y-4">
            <TokenBar
              label="Input"
              value={stats.totalTokensIn}
              total={totalTokens}
              color="bg-tertiary"
            />
            <TokenBar
              label="Output"
              value={stats.totalTokensOut}
              total={totalTokens}
              color="bg-primary"
            />
            <div className="pt-3 border-t border-outline-variant space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Ratio In/Out</span>
                <span className="text-on-surface font-mono">{ratio}:1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total requêtes agents</span>
                <span className="text-on-surface font-mono">{totalAgentRequests.toLocaleString()}</span>
              </div>
              {totalAgentRequests > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Moy. tokens/requête</span>
                  <span className="text-on-surface font-mono">
                    {Math.round(totalTokens / totalAgentRequests).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm text-center py-6">Aucune donnée</p>
        )}
      </div>

      {/* Top Agents summary */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
        <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
          Top Agents
        </h3>
        {stats.byAgent.length > 0 ? (
          <div className="space-y-3">
            {stats.byAgent.slice(0, 5).map((agent) => {
              const agentTotal = agent.tokensIn + agent.tokensOut;
              const pct = totalTokens > 0 ? ((agentTotal / totalTokens) * 100).toFixed(1) : '0';
              return (
                <div key={agent.agentId} className="flex items-center gap-3">
                  <span className="text-sm text-on-surface font-mono flex-1 truncate" title={agent.agentId}>
                    {agent.agentId}
                  </span>
                  <span className="text-xs text-on-surface-variant w-[80px] text-right">
                    {agent.count} req
                  </span>
                  <span className="text-xs text-on-surface font-mono w-[80px] text-right">
                    {formatTokens(agentTotal)}
                  </span>
                  <span className="text-[10px] text-outline w-[40px] text-right">{pct}%</span>
                </div>
              );
            })}
            {stats.byAgent.length > 5 && (
              <p className="text-xs text-outline text-center pt-1">
                +{stats.byAgent.length - 5} autres agents
              </p>
            )}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm text-center py-6">Aucune donnée</p>
        )}
      </div>

      {/* Top Tenants summary */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
        <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
          Top Tenants
        </h3>
        {stats.byTenant.length > 0 ? (
          <div className="space-y-3">
            {stats.byTenant.slice(0, 5).map((tenant) => {
              const tenantTotal = tenant.tokensIn + tenant.tokensOut;
              const pct = totalTokens > 0 ? ((tenantTotal / totalTokens) * 100).toFixed(1) : '0';
              return (
                <div key={tenant.tenantId} className="flex items-center gap-3">
                  <span className="text-sm text-on-surface flex-1 truncate" title={tenant.tenantNom || tenant.tenantId}>
                    {tenant.tenantNom || tenant.tenantId}
                  </span>
                  <span className="text-xs text-on-surface font-mono w-[80px] text-right">
                    {formatTokens(tenantTotal)}
                  </span>
                  <span className="text-[10px] text-outline w-[40px] text-right">{pct}%</span>
                </div>
              );
            })}
            {stats.byTenant.length > 5 && (
              <p className="text-xs text-outline text-center pt-1">
                +{stats.byTenant.length - 5} autres tenants
              </p>
            )}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm text-center py-6">Aucune donnée</p>
        )}
      </div>

      {/* Today detail */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
        <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary">today</span>
          Aujourd'hui
        </h3>
        <div className="space-y-4">
          <div className="bg-surface-high/50 rounded-lg p-4">
            <p className="text-[10px] text-outline uppercase mb-2">Tokens In (today)</p>
            <p className="text-2xl font-semibold text-on-surface">{formatTokens(stats.todayTokensIn)}</p>
          </div>
          <div className="bg-surface-high/50 rounded-lg p-4">
            <p className="text-[10px] text-outline uppercase mb-2">Tokens Out (today)</p>
            <p className="text-2xl font-semibold text-on-surface">{formatTokens(stats.todayTokensOut)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Agents ──────────────────────────────────────

function AgentsTab({ byAgent, totalTokens }: {
  byAgent: UsageStats['byAgent'];
  totalTokens: number;
}) {
  if (byAgent.length === 0) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center">
        <span className="material-symbols-outlined text-outline text-5xl mb-3">psychology</span>
        <p className="text-on-surface-variant text-sm">Aucune donnée par agent</p>
      </div>
    );
  }

  const maxTokens = Math.max(...byAgent.map(a => a.tokensIn + a.tokensOut), 1);

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-5 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
          Consommation par Agent
        </h3>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-high/50 border-b border-outline-variant">
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Agent</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Requêtes</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Tokens In</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Tokens Out</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Total Tokens</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">%</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Usage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          {byAgent.map((agent) => {
            const total = agent.tokensIn + agent.tokensOut;
            const barWidth = (total / maxTokens) * 100;
            const pct = totalTokens > 0 ? ((total / totalTokens) * 100).toFixed(1) : '0';
            return (
              <tr key={agent.agentId} className="hover:bg-primary/5 transition-colors">
                <td className="px-6 py-3 font-mono text-sm text-on-surface">{agent.agentId}</td>
                <td className="px-6 py-3 text-sm text-on-surface text-right">{agent.count.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-on-surface-variant text-right">{formatTokens(agent.tokensIn)}</td>
                <td className="px-6 py-3 text-sm text-on-surface-variant text-right">{formatTokens(agent.tokensOut)}</td>
                <td className="px-6 py-3 text-sm text-on-surface font-semibold text-right">{formatTokens(total)}</td>
                <td className="px-6 py-3 text-sm text-outline text-right">{pct}%</td>
                <td className="px-6 py-3 w-[180px]">
                  <div className="h-1.5 w-full bg-surface-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Tenants ─────────────────────────────────────

function TenantsTab({ byTenant, totalTokens }: {
  byTenant: UsageStats['byTenant'];
  totalTokens: number;
}) {
  if (byTenant.length === 0) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center">
        <span className="material-symbols-outlined text-outline text-5xl mb-3">apartment</span>
        <p className="text-on-surface-variant text-sm">Aucune donnée par tenant</p>
      </div>
    );
  }

  const maxTokens = Math.max(...byTenant.map(t => t.tokensIn + t.tokensOut), 1);

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-5 border-b border-outline-variant">
        <h3 className="font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
          Consommation par Tenant
        </h3>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-high/50 border-b border-outline-variant">
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Tenant</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Tokens In</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Tokens Out</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Total Tokens</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">%</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Usage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          {byTenant.map((tenant) => {
            const total = tenant.tokensIn + tenant.tokensOut;
            const barWidth = (total / maxTokens) * 100;
            const pct = totalTokens > 0 ? ((total / totalTokens) * 100).toFixed(1) : '0';
            return (
              <tr key={tenant.tenantId} className="hover:bg-primary/5 transition-colors">
                <td className="px-6 py-3 text-sm text-on-surface">
                  <span className="font-medium">{tenant.tenantNom || tenant.tenantId}</span>
                  {tenant.tenantNom && (
                    <span className="text-outline font-mono text-xs ml-2">{tenant.tenantId}</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-on-surface-variant text-right">{formatTokens(tenant.tokensIn)}</td>
                <td className="px-6 py-3 text-sm text-on-surface-variant text-right">{formatTokens(tenant.tokensOut)}</td>
                <td className="px-6 py-3 text-sm text-on-surface font-semibold text-right">{formatTokens(total)}</td>
                <td className="px-6 py-3 text-sm text-outline text-right">{pct}%</td>
                <td className="px-6 py-3 w-[180px]">
                  <div className="h-1.5 w-full bg-surface-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────

function TokenBar({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = ((value / total) * 100).toFixed(1);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className="text-on-surface font-mono">
          {formatTokens(value)} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full bg-surface-high rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}