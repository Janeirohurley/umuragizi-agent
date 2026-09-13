import { useState, useEffect } from 'react';
import { api, type AmmpPool, type AmmpModel, type PoolModel } from '../api';

export function Pools() {
  const [pools, setPools] = useState<AmmpPool[]>([]);
  const [models, setModels] = useState<AmmpModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<(AmmpPool & { models: PoolModel[] }) | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPool, setNewPool] = useState({ name: '', description: '', strategy: 'priority' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([api.getPools(), api.getModels()]);
      setPools(p.pools);
      setModels(m.models);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadPool = async (id: string) => {
    const pool = await api.getPool(id);
    setSelectedPool(pool);
  };

  const handleCreate = async () => {
    if (!newPool.name) return;
    await api.createPool(newPool);
    setNewPool({ name: '', description: '', strategy: 'priority' });
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce pool ?')) return;
    await api.deletePool(id);
    if (selectedPool?.id === id) setSelectedPool(null);
    load();
  };

  const handleAddModel = async (modelId: string) => {
    if (!selectedPool) return;
    await api.addModelToPool(selectedPool.id, { modelId });
    loadPool(selectedPool.id);
  };

  const handleRemoveModel = async (modelId: string) => {
    if (!selectedPool) return;
    await api.removeModelFromPool(selectedPool.id, modelId);
    loadPool(selectedPool.id);
  };

  const getModelName = (id: string) => models.find(m => m.id === id)?.name ?? id.slice(0, 8);
  const getModelFullId = (id: string) => models.find(m => m.id === id)?.full_id ?? '—';
  const poolModelIds = selectedPool?.models.map(pm => pm.model_id) ?? [];
  const availableModels = models.filter(m => m.enabled && !poolModelIds.includes(m.id));

  if (loading) return <div className="p-8 text-outline animate-pulse">Chargement...</div>;

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Model Pools</h1>
          <p className="text-on-surface-variant mt-1">Orchestrate model routing, redundancy, and fallback prioritization.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/10">
          <span className="material-symbols-outlined">add</span>
          Create Pool
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Pool List */}
        <section className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
          {pools.map(p => (
            <div key={p.id} onClick={() => loadPool(p.id)} className={`bg-surface-container p-5 border rounded-xl cursor-pointer transition-all ${selectedPool?.id === p.id ? 'border-primary shadow-[inset_0_0_0_1px_var(--color-primary)]' : 'border-outline-variant hover:bg-surface-high'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary">account_tree</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tighter ${p.enabled ? 'bg-secondary/10 text-secondary' : 'bg-on-surface-variant/10 text-on-surface-variant'}`}>
                  {p.enabled ? 'Active' : 'Standby'}
                </span>
              </div>
              <h3 className="font-semibold text-on-surface mb-1">{p.name}</h3>
              <p className="text-sm text-on-surface-variant line-clamp-1">{p.description || 'No description'}</p>
              <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">{p.strategy}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-1 hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))}
          {pools.length === 0 && <p className="text-on-surface-variant text-center py-8">No pools configured</p>}
        </section>

        {/* Pool Detail */}
        {selectedPool ? (
          <section className="w-2/3 flex flex-col gap-4 overflow-y-auto pr-2">
            {/* Strategy */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">route</span>
                <div>
                  <p className="text-[11px] uppercase text-on-surface-variant font-semibold tracking-widest">Strategy</p>
                  <h4 className="font-semibold text-on-surface">{selectedPool.strategy}</h4>
                </div>
              </div>
            </div>

            {/* Models in Pool */}
            <div className="bg-surface-container border border-outline-variant rounded-xl flex-1 flex flex-col">
              <div className="p-5 border-b border-outline-variant flex items-center justify-between">
                <h4 className="font-semibold">Priority Hierarchy</h4>
                <span className="text-xs text-on-surface-variant">{selectedPool.models.length} models</span>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto flex-1">
                {selectedPool.models.map((pm, idx) => (
                  <div key={pm.id} className="p-4 bg-surface-high border border-outline-variant rounded-lg flex items-center gap-4">
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center rounded text-primary font-bold text-sm">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-on-surface">{getModelName(pm.model_id)}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{getModelFullId(pm.model_id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant">Priority: {pm.priority}</p>
                      <p className="text-[10px] text-on-surface-variant">Weight: {pm.weight}</p>
                    </div>
                    <button onClick={() => handleRemoveModel(pm.model_id)} className="p-1.5 hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                {/* Add model dropdown */}
                {availableModels.length > 0 && (
                  <select onChange={e => { if (e.target.value) { handleAddModel(e.target.value); e.target.value = ''; } }} className="w-full p-3 border border-dashed border-outline-variant rounded-lg text-on-surface-variant text-sm bg-transparent focus:outline-none focus:border-primary">
                    <option value="">+ Add model to pool</option>
                    {availableModels.map(m => <option key={m.id} value={m.id}>{m.display_name ?? m.name} ({m.full_id})</option>)}
                  </select>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="w-2/3 flex items-center justify-center text-on-surface-variant">
            <p>Select a pool to view details</p>
          </section>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Pool</h3>
            <input value={newPool.name} onChange={e => setNewPool(p => ({ ...p, name: e.target.value }))} placeholder="Pool name" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <input value={newPool.description} onChange={e => setNewPool(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary" />
            <select value={newPool.strategy} onChange={e => setNewPool(p => ({ ...p, strategy: e.target.value }))} className="w-full bg-surface-high border border-outline-variant rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:border-primary">
              <option value="priority">Priority Failover</option>
              <option value="round_robin">Round Robin</option>
              <option value="lowest_cost">Lowest Cost</option>
              <option value="latency_weighted">Latency Weighted</option>
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-high text-sm">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:opacity-90">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
