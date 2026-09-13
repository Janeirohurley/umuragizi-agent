import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { SecurityEvent } from '../api';
import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../contexts/ToastContext';

export function Security() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { addToast } = useToast();

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getSecurityEvents();
      setEvents(data.events);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement des événements de sécurité';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  usePolling(loadEvents, 20000);

  const severityColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-error/10 text-error border-error/20';
      case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'success': return 'bg-secondary/10 text-secondary border-secondary/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const severityIcon = (type: string) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      default: return 'info';
    }
  };

  const criticalCount = events.filter(e => e.type === 'error').length;
  const warningCount = events.filter(e => e.type === 'warning').length;
  const infoCount = events.filter(e => e.type === 'info' || e.type === 'success').length;

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
          <h1 className="text-2xl font-semibold text-on-surface">Security Monitor</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Real-time security events and threat monitoring.
          </p>
        </div>
        <span className="text-[10px] text-outline font-mono">
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Critical"
          value={criticalCount}
          subtitle="Requires immediate attention"
          icon="error"
          trend={criticalCount > 0 ? { value: `${criticalCount} active`, positive: false } : undefined}
        />
        <KPICard
          title="Warnings"
          value={warningCount}
          subtitle="Monitor closely"
          icon="warning"
          trend={warningCount > 0 ? { value: `${warningCount} pending`, positive: false } : undefined}
        />
        <KPICard
          title="Info"
          value={infoCount}
          subtitle="Routine events"
          icon="info"
        />
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h3 className="text-on-surface font-medium">Security Events</h3>
        </div>
        <DataTable
          columns={[
            {
              key: 'severity',
              label: 'Severity',
              render: (item) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${severityColor(item.type)}`}>
                  <span className="material-symbols-outlined text-sm">{severityIcon(item.type)}</span>
                  {item.type.toUpperCase()}
                </span>
              ),
            },
            {
              key: 'message',
              label: 'Message',
              render: (item) => <span className="text-sm text-on-surface">{item.message}</span>,
            },
            {
              key: 'source',
              label: 'Source',
              render: (item) => (
                <span className="font-mono text-xs text-on-surface-variant">
                  {item.source ?? (item.tenantId ? `Tenant: ${item.tenantId}` : 'System')}
                </span>
              ),
            },
            {
              key: 'timestamp',
              label: 'Timestamp',
              render: (item) => (
                <span className="text-xs text-on-surface-variant">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (item) => {
                const resolved = item.type === 'success' || item.type === 'info';
                return (
                  <StatusBadge
                    status={resolved ? 'active' : 'error'}
                    label={resolved ? 'Resolved' : 'Open'}
                  />
                );
              },
            },
          ]}
          data={events}
          emptyMessage="No security events recorded"
        />
      </div>
    </div>
  );
}