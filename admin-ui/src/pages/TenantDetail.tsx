import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Tenant, ActivationToken, Device, SecurityEvent } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { CopyButton } from '../components/CopyButton';
import { DataTable } from '../components/DataTable';
import { KPICard } from '../components/KPICard';
import { usePolling } from '../hooks/usePolling';

export function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tokens, setTokens] = useState<ActivationToken[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tokens' | 'devices' | 'activity'>('tokens');
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [tenantsData, tokensData, devicesData, eventsData] = await Promise.all([
        api.getTenants(),
        api.getTokens(tenantId),
        api.getDevices(tenantId),
        api.getSecurityEvents(),
      ]);
      const found = tenantsData.tenants.find(t => t.id === tenantId);
      if (found) setTenant(found);
      setTokens(tokensData.tokens);
      setDevices(devicesData.devices);
      setEvents(eventsData.events.filter(e => e.tenantId === tenantId));
      setLastUpdated(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);
  usePolling(loadData, 15000);

  const handleCreateToken = async () => {
    if (!tenantId) return;
    try {
      const result = await api.createToken(tenantId, expiresInDays);
      setNewToken(result.token);
      setShowCreateToken(false);
      loadData();
    } catch {
    }
  };

  const handleRevokeToken = async (token: string) => {
    if (!confirm('Révoquer ce token ?')) return;
    try {
      await api.revokeToken(token);
      loadData();
    } catch {
    }
  };

  const handleDeleteToken = async (token: string) => {
    if (!confirm('Supprimer définitivement ce token ?')) return;
    try {
      await api.deleteToken(token);
      loadData();
    } catch {
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!tenantId || !confirm(`Révoquer l'appareil ${deviceId} ?`)) return;
    try {
      await api.revokeDevice(tenantId, deviceId);
      loadData();
    } catch {
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-outline animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-outline text-5xl mb-3">error</span>
        <p className="text-on-surface-variant">Tenant introuvable</p>
        <button
          onClick={() => navigate('/tenants')}
          className="mt-4 text-primary hover:underline text-sm"
        >
          ← Retour aux tenants
        </button>
      </div>
    );
  }

  const activeDevices = devices.filter(d => d.statut === 'active').length;
  const activeTokens = tokens.filter(t => t.statut === 'active').length;

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tenants')}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-on-surface">{tenant.nom}</h1>
            <StatusBadge status="active" label="Active" />
          </div>
          <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
            <span className="font-mono text-xs">{tenant.id}</span>
            <CopyButton value={tenant.id} />
            <span className="text-outline">•</span>
            <span>Créé le {new Date(tenant.created_at).toLocaleDateString('fr-FR')}</span>
          </p>
          <span className="text-[10px] text-outline font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* New Token Alert */}
      {newToken && (
        <div className="mb-6 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Token créé avec succès
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                Copiez ce token maintenant. Il ne sera plus affiché.
              </p>
            </div>
            <button
              onClick={() => setNewToken(null)}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 bg-surface-highest rounded-lg px-3 py-2 text-sm font-mono text-on-surface break-all">
              {newToken}
            </code>
            <CopyButton value={newToken} label="Copier" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Tokens Actifs"
          value={activeTokens}
          subtitle={`${tokens.length} total`}
          icon="vpn_key"
        />
        <KPICard
          title="Appareils Actifs"
          value={activeDevices}
          subtitle={`${devices.length} total`}
          icon="smartphone"
        />
        <KPICard
          title="Événements"
          value={events.length}
          subtitle="Événements de sécurité"
          icon="security"
        />
        <KPICard
          title="Dernière Activité"
          value={devices.length > 0
            ? new Date(Math.max(...devices.map(d => d.lastUsed ? new Date(d.lastUsed).getTime() : 0))).toLocaleDateString('fr-FR')
            : 'N/A'}
          subtitle="Dernier accès"
          icon="schedule"
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-surface-high rounded-lg p-1 w-fit">
        {([
          ['tokens', 'Tokens', 'vpn_key'],
          ['devices', 'Appareils', 'smartphone'],
          ['activity', 'Activité', 'receipt_long'],
        ] as const).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === key
                ? 'bg-surface-container text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Tokens */}
      {activeTab === 'tokens' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowCreateToken(!showCreateToken)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Créer un token
            </button>
          </div>

          {showCreateToken && (
            <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-4 flex items-end gap-3">
              <div>
                <label className="text-[10px] text-outline uppercase block mb-1">Expiration (jours)</label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="bg-surface-highest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface w-24 focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleCreateToken}
                className="px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors"
              >
                Générer
              </button>
              <button
                onClick={() => setShowCreateToken(false)}
                className="px-4 py-2 bg-surface-high text-on-surface rounded-lg text-sm font-medium border border-outline-variant hover:bg-surface-highest transition-colors"
              >
                Annuler
              </button>
            </div>
          )}

          <DataTable
            columns={[
              {
                key: 'token-col',
                label: 'Token',
                render: (item) => (
                  <div className="flex items-center gap-1 max-w-[200px]">
                    <code className="text-xs font-mono text-on-surface truncate">
                      {item.token.substring(0, 12)}...
                    </code>
                    <CopyButton value={item.token} />
                  </div>
                ),
              },
              {
                key: 'statut-col',
                label: 'Statut',
                render: (item) => (
                  <StatusBadge
                    status={item.statut === 'active' ? 'active' : 'inactive'}
                    label={item.statut === 'active' ? 'Actif' : 'Inactif'}
                  />
                ),
              },
              {
                key: 'expires-col',
                label: 'Expire le',
                render: (item) => new Date(item.expiresAt).toLocaleDateString('fr-FR'),
              },
              {
                key: 'created-col',
                label: 'Créé le',
                render: (item) => new Date(item.createdAt).toLocaleDateString('fr-FR'),
              },
              {
                key: 'actions-col',
                label: 'Actions',
                render: (item) => (
                  <div className="flex items-center gap-2">
                    {item.statut === 'active' && (
                      <button
                        onClick={() => handleRevokeToken(item.token)}
                        className="text-amber-400 hover:text-amber-300 text-xs transition-colors"
                      >
                        Révoquer
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteToken(item.token)}
                      className="text-error hover:text-error/80 text-xs transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                ),
              },
            ]}
            data={tokens}
            emptyMessage="Aucun token pour ce tenant"
          />
        </div>
      )}

      {/* Tab: Devices */}
      {activeTab === 'devices' && (
        <DataTable
          columns={[
            {
              key: 'device-col',
              label: 'Device ID',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono text-on-surface">{item.deviceId}</code>
                  <CopyButton value={item.deviceId} />
                </div>
              ),
            },
            {
              key: 'statut-col',
              label: 'Statut',
              render: (item) => (
                <StatusBadge
                  status={item.statut === 'active' ? 'active' : 'inactive'}
                  label={item.statut === 'active' ? 'Actif' : 'Inactif'}
                />
              ),
            },
            {
              key: 'version-col',
              label: 'Version',
              render: (item) => (
                <span className="font-mono text-xs">{item.appVersion ?? 'N/A'}</span>
              ),
            },
            {
              key: 'lastused-col',
              label: 'Dernier accès',
              render: (item) => item.lastUsed
                ? new Date(item.lastUsed).toLocaleString('fr-FR')
                : 'Jamais',
            },
            {
              key: 'created-col',
              label: 'Enregistré le',
              render: (item) => new Date(item.createdAt).toLocaleDateString('fr-FR'),
            },
            {
              key: 'actions-col',
              label: 'Actions',
              render: (item) => (
                <button
                  onClick={() => handleRevokeDevice(item.deviceId)}
                  className="text-error hover:text-error/80 text-xs transition-colors"
                >
                  Révoquer
                </button>
              ),
            },
          ]}
          data={devices}
          emptyMessage="Aucun appareil enregistré"
        />
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <DataTable
          columns={[
            {
              key: 'type-col',
              label: 'Type',
              render: (item) => (
                <StatusBadge
                  status={item.type === 'error' ? 'error' : item.type === 'warning' ? 'warning' : item.type === 'success' ? 'active' : 'info'}
                  label={item.type}
                />
              ),
            },
            {
              key: 'message-col',
              label: 'Message',
              render: (item) => (
                <span className="text-sm text-on-surface">{item.message}</span>
              ),
            },
            {
              key: 'time-col',
              label: 'Timestamp',
              render: (item) => new Date(item.timestamp).toLocaleString('fr-FR'),
            },
          ]}
          data={events}
          emptyMessage="Aucune activité récente"
        />
      )}
    </div>
  );
}