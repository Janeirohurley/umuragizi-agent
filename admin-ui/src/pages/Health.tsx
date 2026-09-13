import { useState, useEffect } from 'react';
import { api, type ProviderHealth, type RoutingStatus, type RequestLog, type AmmpProvider } from '../api';

export function Health() {
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [providers, setProviders] = useState<AmmpProvider[]>([]);
  const [status, setStatus] = useState<RoutingStatus | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [h, s, l, p] = await Promise.all([
        api.getHealthAll(),
        api.getRoutingStatus(),
        api.getRequestLogs(30),
        api.getProviders(),
      ]);
      setHealth(h.health);
      setStatus(s);
      setLogs(l.logs);
      setProviders(p.providers);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTest = async (providerId: string) => {
    await api.testProviderHealth(providerId);
    load();
  };

  const handleClearCooldown = async (providerId: string) => {
    await api.clearCooldown(providerId);
    load();
  };

  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name ?? id;

  if (loading) return <div className="p-8 text-outline animate-pulse">Chargement...</div>;

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      <h1 className="text-3xl font-bold text-on-surface mb-6">Health & Routing</h1>

      {/* Routing Status Cards */}
      {status && (
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Providers', value: `${status.enabledProviders}/${status.totalProviders}`, icon: 'dns' },
            { label: 'Accounts', value: `${status.availableAccounts}/${status.totalAccounts}`, icon: 'key' },
            { label: 'Models', value: `${status.enabledModels}/${status.totalModels}`, icon: 'model_training' },
            { label: 'Pools', value: String(status.totalPools), icon: 'account_tree' },
            { label: 'Cooldowns', value: String(status.activeCooldowns), icon: 'timer', warn: status.activeCooldowns > 0 },
          ].map(card => (
            <div key={card.label} className="bg-surface-container border border-outline-variant p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">{card.label}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${card.warn ? 'text-error' : 'text-on-surface'}`}>{card.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provider Health */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden mb-8">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-semibold text-on-surface">Provider Health</h3>
          <button onClick={load} className="text-primary text-sm hover:underline">Refresh</button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-high/50 border-b border-outline-variant">
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Provider</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Status</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Latency</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Failures</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Last Check</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {providers.map(p => {
              const h = health.find(x => x.provider_id === p.id);
              const statusColor = h?.status === 'healthy' ? 'text-secondary' : h?.status === 'down' ? 'text-error' : 'text-on-surface-variant';
              const statusDot = h?.status === 'healthy' ? 'bg-secondary' : h?.status === 'down' ? 'bg-error' : 'bg-outline';
              return (
                <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4 font-semibold text-on-surface">{p.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                      <span className={`text-xs font-bold uppercase ${statusColor}`}>{h?.status ?? 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{h?.latency_ms != null ? `${h.latency_ms}ms` : '—'}</td>
                  <td className="px-6 py-4">{h?.consecutive_failures ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{h?.last_check ? new Date(h.last_check).toLocaleString() : 'Never'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleTest(p.id)} className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors mr-2">Test</button>
                    {h?.cooldown_until && <button onClick={() => handleClearCooldown(p.id)} className="px-3 py-1.5 text-xs bg-error/10 text-error rounded hover:bg-error/20 transition-colors">Clear Cooldown</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Request Logs */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-5 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface">Recent Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-high/50 border-b border-outline-variant">
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Time</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Provider</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Latency</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Tokens</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-3 text-sm text-on-surface-variant">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm">{getProviderName(l.provider_id)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.status === 'success' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-sm">{l.latency_ms != null ? `${l.latency_ms}ms` : '—'}</td>
                  <td className="px-6 py-3 text-sm">{l.tokens_in + l.tokens_out > 0 ? `${l.tokens_in}→${l.tokens_out}` : '—'}</td>
                  <td className="px-6 py-3 text-sm text-error max-w-[200px] truncate">{l.error_message ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">No request logs</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
