import { useState, useEffect } from 'react';
import { api, type AmmpProvider, type AmmpAccount } from '../api';

export function Providers() {
  const [providers, setProviders] = useState<AmmpProvider[]>([]);
  const [accounts, setAccounts] = useState<AmmpAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState({ name: '', baseUrl: '' });
  const [newAccount, setNewAccount] = useState({ providerId: '', name: '', apiKey: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([api.getProviders(), api.getAccounts()]);
      setProviders(p.providers);
      setAccounts(a.accounts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateProvider = async () => {
    if (!newProvider.name || !newProvider.baseUrl) return;
    await api.createProvider(newProvider);
    setNewProvider({ name: '', baseUrl: '' });
    setShowAddProvider(false);
    load();
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Supprimer ce provider ?')) return;
    await api.deleteProvider(id);
    load();
  };

  const handleToggleProvider = async (id: string, enabled: boolean) => {
    await api.toggleProvider(id, enabled);
    load();
  };

  const handleCreateAccount = async () => {
    if (!newAccount.providerId || !newAccount.name || !newAccount.apiKey) return;
    await api.createAccount(newAccount);
    setNewAccount({ providerId: '', name: '', apiKey: '' });
    setShowAddAccount(false);
    load();
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Supprimer ce compte ?')) return;
    await api.deleteAccount(id);
    load();
  };

  const filteredAccounts = selectedProvider
    ? accounts.filter(a => a.provider_id === selectedProvider)
    : accounts;

  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name ?? id;

  if (loading) return <div className="p-8 text-outline animate-pulse">Chargement...</div>;

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Providers & Accounts</h1>
          <p className="text-on-surface-variant mt-1">Orchestrate your AI backbone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddAccount(true)} className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-lg hover:bg-surface-high transition-all text-on-surface">
            <span className="material-symbols-outlined text-sm">key</span>
            Add Account
          </button>
          <button onClick={() => setShowAddProvider(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined">add</span>
            Add Provider
          </button>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {providers.map(p => {
          const providerAccounts = accounts.filter(a => a.provider_id === p.id);
          const isEnabled = p.enabled;
          return (
            <div key={p.id} className="bg-surface-container border border-outline-variant rounded-xl p-5 relative group">
              <div className="absolute top-4 right-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${isEnabled ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-error/10 text-error border border-error/20'}`}>
                  {isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">dns</span>
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface">{p.name}</h3>
                  <p className="text-sm text-on-surface-variant">{providerAccounts.length} accounts</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-outline-variant/30">
                <button onClick={() => setSelectedProvider(selectedProvider === p.id ? null : p.id)} className="text-primary text-sm font-semibold hover:underline">
                  View Details
                </button>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleProvider(p.id, !isEnabled)} className="p-1.5 hover:text-primary transition-colors" title={isEnabled ? 'Disable' : 'Enable'}>
                    <span className="material-symbols-outlined text-sm">{isEnabled ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button onClick={() => handleDeleteProvider(p.id)} className="p-1.5 hover:text-error transition-colors" title="Delete">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accounts Table */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-on-surface">API Accounts</h3>
            <p className="text-sm text-on-surface-variant">{filteredAccounts.length} accounts {selectedProvider ? `for ${getProviderName(selectedProvider)}` : 'total'}</p>
          </div>
          {selectedProvider && (
            <button onClick={() => setSelectedProvider(null)} className="text-primary text-sm hover:underline">Show All</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-high/50 border-b border-outline-variant">
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Account</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Provider</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">API Key</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Quota</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredAccounts.map(a => {
                const quotaPct = a.quota_daily ? Math.min(100, (a.usage_daily / a.quota_daily) * 100) : 0;
                const isQuotaHigh = quotaPct > 80;
                return (
                  <tr key={a.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-on-surface">{a.name}</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{getProviderName(a.provider_id)}</td>
                    <td className="px-6 py-4">
                      <code className="font-mono text-xs bg-surface px-2 py-1 rounded">{a.maskedKey ?? '••••••••'}</code>
                    </td>
                    <td className="px-6 py-4 min-w-[180px]">
                      {a.quota_daily ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span className="text-on-surface-variant">{a.usage_daily} / {a.quota_daily}</span>
                            <span className={isQuotaHigh ? 'text-error' : 'text-primary'}>{Math.round(quotaPct)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${isQuotaHigh ? 'bg-error' : 'bg-primary'}`} style={{ width: `${quotaPct}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">No limit</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.enabled ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-error/10 text-error border border-error/20'}`}>
                        {a.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteAccount(a.id)} className="p-2 hover:text-error transition-colors">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAccounts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">No accounts configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddProvider(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Provider</h3>
            <input value={newProvider.name} onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))} placeholder="Name (e.g. OpenAI)" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <input value={newProvider.baseUrl} onChange={e => setNewProvider(p => ({ ...p, baseUrl: e.target.value }))} placeholder="Base URL (e.g. https://api.openai.com/v1)" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:border-primary" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddProvider(false)} className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-high text-sm">Cancel</button>
              <button onClick={handleCreateProvider} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:opacity-90">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddAccount(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Account</h3>
            <select value={newAccount.providerId} onChange={e => setNewAccount(a => ({ ...a, providerId: e.target.value }))} className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary">
              <option value="">Select provider</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={newAccount.name} onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))} placeholder="Account label" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <input value={newAccount.apiKey} onChange={e => setNewAccount(a => ({ ...a, apiKey: e.target.value }))} placeholder="API Key" type="password" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:border-primary" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddAccount(false)} className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-high text-sm">Cancel</button>
              <button onClick={handleCreateAccount} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:opacity-90">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
