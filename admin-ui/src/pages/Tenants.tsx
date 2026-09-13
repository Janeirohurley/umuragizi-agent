import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Tenant } from '../api';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { CopyButton } from '../components/CopyButton';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../contexts/ToastContext';

export function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { addToast } = useToast();

  const loadTenants = useCallback(async () => {
    try {
      const { tenants } = await api.getTenants();
      setTenants(tenants);
      setLastUpdated(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);
  usePolling(loadTenants, 20000);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createTenant(newName.trim());
      setNewName('');
      setShowCreate(false);
      loadTenants();
      addToast(`Tenant "${newName.trim()}" créé avec succès`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création du tenant';
      addToast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.updateTenant(id, editName.trim());
      setEditingId(null);
      loadTenants();
      addToast(`Tenant mis à jour avec succès`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du tenant';
      addToast(msg, 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le tenant "${name}" et toutes ses données ?`)) return;
    try {
      await api.deleteTenant(id);
      loadTenants();
      addToast(`Tenant "${name}" supprimé`, 'warning');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression du tenant';
      addToast(msg, 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Tenants</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage organizations and their access.</p>
          <span className="text-[10px] text-outline font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create Tenant
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-4 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du tenant..."
            className="flex-1 bg-surface-highest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors disabled:opacity-50"
          >
            {creating ? 'Création...' : 'Créer'}
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewName(''); }}
            className="px-4 py-2 bg-surface-high text-on-surface rounded-lg text-sm font-medium border border-outline-variant hover:bg-surface-highest transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-outline animate-pulse">Chargement...</div>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'id-col',
              label: 'ID',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{item.id}</span>
                  <CopyButton value={item.id} />
                </div>
              ),
            },
            {
              key: 'nom-col',
              label: 'Nom',
              render: (item) => {
                if (editingId === item.id) {
                  return (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(item.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-surface-highest border border-outline-variant rounded px-2 py-1 text-sm text-on-surface w-full focus:outline-none focus:border-primary"
                      autoFocus
                    />
                  );
                }
                return <span className="font-medium">{item.nom}</span>;
              },
            },
            {
              key: 'created-col',
              label: 'Créé le',
              render: (item) => new Date(item.created_at).toLocaleDateString(),
            },
            {
              key: 'actions-col',
              label: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <StatusBadge status="active" label="Active" />
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(item.id)}
                        className="text-secondary hover:text-secondary/80 text-xs transition-colors"
                      >
                        Sauver
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-outline hover:text-on-surface text-xs transition-colors"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingId(item.id); setEditName(item.nom); }}
                        className="text-primary hover:text-primary/80 text-xs transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.nom)}
                        className="text-error hover:text-error/80 text-xs transition-colors"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={tenants}
          emptyMessage="Aucun tenant configuré"
        />
      )}
    </div>
  );
}
