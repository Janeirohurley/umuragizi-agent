import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Tenant, Device } from '../api';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { CopyButton } from '../components/CopyButton';
import { usePolling } from '../hooks/usePolling';

export function Devices() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    api.getTenants().then(({ tenants }) => {
      setTenants(tenants);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadDevices = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const { devices } = await api.getDevices(selectedTenant);
      setDevices(devices);
      setLastUpdated(new Date());
    } catch {
      setDevices([]);
    }
  }, [selectedTenant]);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  usePolling(loadDevices, 20000, !!selectedTenant);

  const handleRevoke = async (deviceId: string) => {
    if (!selectedTenant) return;
    if (!confirm(`Révoquer le device ${deviceId.slice(0, 12)}... ?`)) return;
    try {
      await api.revokeDevice(selectedTenant, deviceId);
      loadDevices();
    } catch {
    }
  };

  const activeDevices = devices.filter(d => d.statut === 'actif').length;
  const revokedDevices = devices.filter(d => d.statut === 'revoque').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Devices</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage registered devices.</p>
          {selectedTenant && (
            <span className="text-[10px] text-outline font-mono">
              {activeDevices} actifs, {revokedDevices} révoqués — Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <select
          value={selectedTenant}
          onChange={(e) => { setSelectedTenant(e.target.value); setShowDetails(null); }}
          className="bg-surface-highest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="">Sélectionner un tenant...</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.nom} ({t.id})</option>
          ))}
        </select>
      </div>

      {showDetails && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-4">
          {(() => {
            const device = devices.find(d => d.deviceId === showDetails);
            if (!device) return null;
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-on-surface font-medium">Device Details</p>
                  <button
                    onClick={() => setShowDetails(null)}
                    className="text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-outline uppercase">Device ID</p>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="font-mono text-xs text-on-surface">{device.deviceId}</p>
                      <CopyButton value={device.deviceId} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline uppercase">Status</p>
                    <div className="mt-1">
                      <StatusBadge
                        status={device.statut === 'actif' ? 'active' : 'error'}
                        label={device.statut}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline uppercase">App Version</p>
                    <p className="text-xs text-on-surface mt-1">{device.appVersion ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline uppercase">Created</p>
                    <p className="text-xs text-on-surface mt-1">{new Date(device.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline uppercase">Last Used</p>
                    <p className="text-xs text-on-surface mt-1">
                      {device.lastUsed ? new Date(device.lastUsed).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline uppercase">Tenant</p>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="font-mono text-xs text-on-surface">{selectedTenant}</p>
                      <CopyButton value={selectedTenant} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
              key: 'device-col',
              label: 'Device ID',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{item.deviceId}</span>
                  <CopyButton value={item.deviceId} />
                </div>
              ),
            },
            {
              key: 'statut-col',
              label: 'Statut',
              render: (item) => (
                <StatusBadge
                  status={item.statut === 'actif' ? 'active' : 'error'}
                  label={item.statut}
                />
              ),
            },
            {
              key: 'version-col',
              label: 'Version',
              render: (item) => item.appVersion ?? 'N/A',
            },
            {
              key: 'last-col',
              label: 'Dernière utilisation',
              render: (item) => item.lastUsed ? new Date(item.lastUsed).toLocaleString() : 'Jamais',
            },
            {
              key: 'created-col',
              label: 'Créé le',
              render: (item) => new Date(item.createdAt).toLocaleDateString(),
            },
            {
              key: 'actions-col',
              label: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetails(showDetails === item.deviceId ? null : item.deviceId)}
                    className="text-primary hover:text-primary/80 text-xs transition-colors"
                  >
                    {showDetails === item.deviceId ? 'Masquer' : 'Détails'}
                  </button>
                  {item.statut === 'actif' && (
                    <button
                      onClick={() => handleRevoke(item.deviceId)}
                      className="text-error hover:text-error/80 text-xs transition-colors"
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={devices}
          emptyMessage={selectedTenant ? 'Aucun device pour ce tenant' : 'Sélectionner un tenant'}
        />
      )}
    </div>
  );
}
