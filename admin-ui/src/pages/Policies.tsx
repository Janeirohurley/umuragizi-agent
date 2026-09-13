import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { RoutingPolicy } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';

export function Policies() {
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadPolicies = useCallback(async () => {
    try {
      const data = await api.getPolicies();
      setPolicies(data.policies);
      setLastUpdated(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);
  usePolling(loadPolicies, 20000);

  const enabledCount = policies.filter(p => p.enabled).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Policies</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage routing policies and rules for request distribution.</p>
          <span className="text-[10px] text-outline font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{policies.length}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Actives</p>
          <p className="text-2xl font-bold text-secondary mt-1">{enabledCount}</p>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Inactives</p>
          <p className="text-2xl font-bold text-outline mt-1">{policies.length - enabledCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-outline animate-pulse">Chargement...</div>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Nom',
              render: (item) => (
                <div>
                  <span className="font-medium text-on-surface">{item.name}</span>
                  {item.description && (
                    <p className="text-[10px] text-outline mt-0.5">{item.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'priority',
              label: 'Priorité',
              render: (item) => (
                <span className="font-mono text-sm">{item.priority}</span>
              ),
            },
            {
              key: 'action',
              label: 'Action',
              render: (item) => (
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {item.action}
                </span>
              ),
            },
            {
              key: 'target',
              label: 'Cible',
              render: (item) => (
                <span className="font-mono text-xs text-on-surface-variant">
                  {item.target_pool_id ?? '—'}
                </span>
              ),
            },
            {
              key: 'conditions',
              label: 'Conditions',
              render: (item) => (
                <span className="text-xs text-on-surface-variant">
                  {item.conditions?.length ?? 0} règle{(item.conditions?.length ?? 0) !== 1 ? 's' : ''}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Statut',
              render: (item) => (
                <StatusBadge
                  status={item.enabled ? 'active' : 'inactive'}
                  label={item.enabled ? 'Active' : 'Inactive'}
                />
              ),
            },
          ]}
          data={policies}
          emptyMessage="Aucune politique de routage configurée"
        />
      )}
    </div>
  );
}