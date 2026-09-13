import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { AgentStatus } from '../api';
import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../contexts/ToastContext';

export function Agents() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { addToast } = useToast();

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.getAgentsStatus();
      setAgents(data.agents);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement des agents';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadAgents(); }, [loadAgents]);
  usePolling(loadAgents, 15000);

  const activeCount = agents.filter(a => a.status === 'active').length;
  const inactiveCount = agents.filter(a => a.status === 'inactive').length;
  const errorCount = agents.filter(a => a.status === 'error').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-outline animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Agents</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Monitor and manage AI agents across the platform.
          </p>
        </div>
        <span className="text-[10px] text-outline font-mono">
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Active"
          value={activeCount}
          subtitle="Running agents"
          icon="psychology"
          trend={{ value: `${activeCount} online`, positive: true }}
        />
        <KPICard
          title="Inactive"
          value={inactiveCount}
          subtitle="Idle agents"
          icon="sleep"
        />
        <KPICard
          title="Errors"
          value={errorCount}
          subtitle="Requires attention"
          icon="error"
          trend={errorCount > 0 ? { value: `${errorCount} failing`, positive: false } : undefined}
        />
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h3 className="text-on-surface font-medium">All Agents</h3>
        </div>
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Agent',
              render: (item) => (
                <div>
                  <span className="text-sm text-on-surface font-medium">{item.name}</span>
                  <p className="text-[11px] text-on-surface-variant font-mono">{item.model}</p>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (item) => (
                <StatusBadge
                  status={item.status === 'active' ? 'active' : item.status === 'error' ? 'error' : 'inactive'}
                  label={item.status === 'active' ? 'Active' : item.status === 'error' ? 'Error' : 'Inactive'}
                />
              ),
            },
            {
              key: 'type',
              label: 'Type',
              render: (item) => (
                <span className="text-xs text-on-surface-variant capitalize">{item.type ?? 'Standard'}</span>
              ),
            },
            {
              key: 'lastActive',
              label: 'Last Active',
              render: (item) => (
                <span className="text-xs text-on-surface-variant">
                  {item.lastActive ? new Date(item.lastActive).toLocaleString() : 'Never'}
                </span>
              ),
            },
          ]}
          data={agents}
          emptyMessage="No agents configured"
        />
      </div>
    </div>
  );
}