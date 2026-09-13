import { useState, useEffect } from 'react';
import { api, type AmmpModel, type AmmpProvider } from '../api';

export function ModelsPage() {
  const [models, setModels] = useState<AmmpModel[]>([]);
  const [providers, setProviders] = useState<AmmpProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AmmpModel | null>(null);
  const [newModel, setNewModel] = useState({ providerId: '', name: '', fullName: '', contextWindow: '', supportsTools: false, supportsVision: false, costPer1kInput: '', costPer1kOutput: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([api.getModels(), api.getProviders()]);
      setModels(m.models);
      setProviders(p.providers);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newModel.providerId || !newModel.name) return;
    await api.createModel({
      providerId: newModel.providerId,
      name: newModel.name,
      fullName: newModel.fullName || undefined,
      contextWindow: newModel.contextWindow ? Number(newModel.contextWindow) : undefined,
      supportsTools: newModel.supportsTools,
      supportsVision: newModel.supportsVision,
      costPer1kInput: newModel.costPer1kInput ? Number(newModel.costPer1kInput) : undefined,
      costPer1kOutput: newModel.costPer1kOutput ? Number(newModel.costPer1kOutput) : undefined,
    });
    setShowAdd(false);
    setNewModel({ providerId: '', name: '', fullName: '', contextWindow: '', supportsTools: false, supportsVision: false, costPer1kInput: '', costPer1kOutput: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce modèle ?')) return;
    await api.deleteModel(id);
    if (selectedModel?.id === id) setSelectedModel(null);
    load();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await api.toggleModel(id, enabled);
    load();
  };

  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name ?? id;

  const formatCtx = (n: number | null) => {
    if (!n) return 'N/A';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M+`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
  };

  if (loading) return <div className="p-8 text-outline animate-pulse">Chargement...</div>;

  return (
    <div className="p-8 max-w-[1440px] mx-auto flex gap-6">
      {/* Main Table */}
      <div className={`flex-1 ${selectedModel ? 'pr-0' : ''}`}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Model Catalog</h1>
            <p className="text-on-surface-variant mt-1">{models.length} models across {providers.length} providers.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined">add</span>
            Add Model
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Active</span>
            <div className="text-2xl font-bold text-on-surface mt-1">{models.filter(m => m.enabled).length}</div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Tools</span>
            <div className="text-2xl font-bold text-on-surface mt-1">{models.filter(m => m.supports_tools).length}</div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Vision</span>
            <div className="text-2xl font-bold text-on-surface mt-1">{models.filter(m => m.supports_vision).length}</div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Providers</span>
            <div className="text-2xl font-bold text-on-surface mt-1">{providers.length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-high/50 border-b border-outline-variant">
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Model Name</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Provider</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Capabilities</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-center">Context</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-center">Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {models.map(m => (
                <tr key={m.id} className={`hover:bg-primary/5 cursor-pointer transition-colors ${selectedModel?.id === m.id ? 'bg-primary/5' : ''}`} onClick={() => setSelectedModel(m)}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-on-surface">{m.display_name ?? m.name}</div>
                    <div className="text-xs text-on-surface-variant">{m.full_id}</div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{getProviderName(m.provider_id)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {m.supports_tools && <span className="material-symbols-outlined text-primary text-sm p-1 rounded bg-primary/10">build</span>}
                      {m.supports_vision && <span className="material-symbols-outlined text-primary text-sm p-1 rounded bg-primary/10">visibility</span>}
                      {m.supports_streaming && <span className="material-symbols-outlined text-primary text-sm p-1 rounded bg-primary/10">stream</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-mono text-xs bg-surface-high px-2 py-1 rounded">{formatCtx(m.context_window)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.enabled ? 'bg-secondary' : 'bg-error'}`} />
                      <span className={`text-xs font-bold uppercase ${m.enabled ? 'text-secondary' : 'text-error'}`}>{m.enabled ? 'Active' : 'Disabled'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(m.id, !m.enabled); }} className="p-1.5 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm">{m.enabled ? 'pause' : 'play_arrow'}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="p-1.5 hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sidebar */}
      {selectedModel && (
        <div className="w-96 shrink-0 bg-surface-container border border-outline-variant rounded-xl p-5 h-fit sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-on-surface">Model Details</h3>
            <button onClick={() => setSelectedModel(null)} className="p-1 hover:bg-surface-high rounded-full transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-primary text-3xl">model_training</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">{selectedModel.display_name ?? selectedModel.name}</h2>
            <p className="text-sm text-on-surface-variant">{selectedModel.full_id}</p>
          </div>
          <div className="space-y-3">
            <div className="bg-surface-high p-3 rounded-lg border border-outline-variant">
              <span className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest block mb-1">Context Window</span>
              <span className="text-lg font-bold text-on-surface">{formatCtx(selectedModel.context_window)}</span>
            </div>
            {selectedModel.cost_per_1k_input != null && (
              <div className="bg-surface-high p-3 rounded-lg border border-outline-variant">
                <span className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest block mb-1">Cost (per 1K tokens)</span>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Input</span>
                  <span className="font-bold">${selectedModel.cost_per_1k_input}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Output</span>
                  <span className="font-bold">${selectedModel.cost_per_1k_output ?? '—'}</span>
                </div>
              </div>
            )}
            <div className="bg-surface-high p-3 rounded-lg border border-outline-variant">
              <span className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest block mb-2">Capabilities</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedModel.supports_tools && <span className="px-2 py-0.5 bg-surface rounded text-xs border border-outline-variant">Tools</span>}
                {selectedModel.supports_vision && <span className="px-2 py-0.5 bg-surface rounded text-xs border border-outline-variant">Vision</span>}
                {selectedModel.supports_streaming && <span className="px-2 py-0.5 bg-surface rounded text-xs border border-outline-variant">Streaming</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Model</h3>
            <select value={newModel.providerId} onChange={e => setNewModel(m => ({ ...m, providerId: e.target.value }))} className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary">
              <option value="">Select provider</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={newModel.name} onChange={e => setNewModel(m => ({ ...m, name: e.target.value }))} placeholder="Model name" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <input value={newModel.fullName} onChange={e => setNewModel(m => ({ ...m, fullName: e.target.value }))} placeholder="Full ID (provider/model-name)" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <input value={newModel.contextWindow} onChange={e => setNewModel(m => ({ ...m, contextWindow: e.target.value }))} placeholder="Context window (e.g. 128000)" type="number" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newModel.supportsTools} onChange={e => setNewModel(m => ({ ...m, supportsTools: e.target.checked }))} className="accent-primary" /> Tools</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newModel.supportsVision} onChange={e => setNewModel(m => ({ ...m, supportsVision: e.target.checked }))} className="accent-primary" /> Vision</label>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-high text-sm">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:opacity-90">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
