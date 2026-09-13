import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { AuditLog } from '../api';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { usePolling } from '../hooks/usePolling';

export function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadLogs = useCallback(async () => {
    try {
      const { logs } = await api.getAuditLogs();
      setLogs(logs);
      setLastUpdated(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  usePolling(loadLogs, 10000);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Audit Logs</h1>
          <p className="text-on-surface-variant text-sm mt-1">System activity trail and security events.</p>
          <span className="text-[10px] text-outline font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-outline animate-pulse">Chargement...</div>
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'ID', render: (item) => <span className="font-mono text-xs">{item.id}</span> },
            { key: 'action', label: 'Action', render: (item) => (
              <StatusBadge
                status={item.action === 'activation' ? 'active' : item.action === 'revocation' ? 'error' : 'info'}
                label={item.action}
              />
            )},
            { key: 'tenantId', label: 'Tenant', render: (item) => <span className="font-mono text-xs">{item.tenantId ?? 'N/A'}</span> },
            { key: 'deviceId', label: 'Device', render: (item) => <span className="font-mono text-xs">{item.deviceId ?? 'N/A'}</span> },
            { key: 'details', label: 'Détails', render: (item) => <span className="text-on-surface-variant text-xs">{item.details}</span> },
            { key: 'timestamp', label: 'Timestamp', render: (item) => new Date(item.timestamp).toLocaleString() },
          ]}
          data={logs}
          emptyMessage="Aucun log d'audit"
        />
      )}
    </div>
  );
}
