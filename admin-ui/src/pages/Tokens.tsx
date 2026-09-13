import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Tenant, ActivationToken, ServerInfo } from '../api';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { CopyButton } from '../components/CopyButton';
import { usePolling } from '../hooks/usePolling';

export function Tokens() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [tokens, setTokens] = useState<ActivationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [showFullToken, setShowFullToken] = useState<string | null>(null);
  const [mobileSnippet, setMobileSnippet] = useState<{ token: string; serverInfo: ServerInfo } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    api.getTenants().then(({ tenants }) => {
      setTenants(tenants);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadTokens = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const { tokens } = await api.getTokens(selectedTenant);
      setTokens(tokens);
      setLastUpdated(new Date());
    } catch {
      setTokens([]);
    }
  }, [selectedTenant]);

  useEffect(() => { loadTokens(); }, [loadTokens]);
  usePolling(loadTokens, 20000, !!selectedTenant);

  const handleGenerate = async () => {
    if (!selectedTenant) return;
    setGenerating(true);
    try {
      const { token } = await api.createToken(selectedTenant);
      setNewTokenValue(token);
      loadTokens();
    } catch {
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    try {
      await api.revokeToken(token);
      loadTokens();
    } catch {
    }
  };

  const handleDelete = async (token: string) => {
    if (!confirm('Supprimer ce token définitivement ?')) return;
    try {
      await api.deleteToken(token);
      loadTokens();
    } catch {
    }
  };

  const handleCopyForMobile = async (token: string) => {
    try {
      const serverInfo = await api.getServerInfo();
      setMobileSnippet({ token, serverInfo });
    } catch {
    }
  };

  const getMobileSnippet = () => {
    if (!mobileSnippet) return '';
    const { token, serverInfo } = mobileSnippet;
    return `# Activation d'un appareil mobile
# Endpoint: ${serverInfo.activateUrl}

curl -X POST ${serverInfo.activateUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "${token}",
    "publicKey": "<PUBLIC_KEY_RSA_DE_LAppAREIL>",
    "appVersion": "1.0.0"
  }'

# Réponse attendue:
# {
#   "deviceId": "dev_xxx",
#   "tenantId": "tn_xxx",
#   "accessToken": "acc_xxx",
#   "refreshToken": "ref_xxx"
# }`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Activation Tokens</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage device activation tokens.</p>
          {selectedTenant && (
            <span className="text-[10px] text-outline font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!selectedTenant || generating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {generating ? 'Génération...' : 'Generate Token'}
        </button>
      </div>

      {newTokenValue && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-on-surface font-medium">Token généré avec succès!</p>
              <p className="text-xs text-on-surface-variant mt-1">Copiez ce token, il ne sera plus affiché.</p>
            </div>
            <CopyButton value={newTokenValue} label="Copier le token" className="text-secondary" />
          </div>
          <div className="mt-2 bg-surface-highest rounded-lg p-3 font-mono text-xs text-on-surface break-all">
            {newTokenValue}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleCopyForMobile(newTokenValue)}
              className="text-xs text-secondary hover:text-secondary/80 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">phone_android</span>
              Copier pour mobile
            </button>
            <button
              onClick={() => setNewTokenValue(null)}
              className="text-xs text-outline hover:text-on-surface transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {mobileSnippet && (
        <div className="bg-surface-container border border-secondary/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">phone_android</span>
              <p className="text-sm text-on-surface font-medium">Activation Mobile — Prêt à copier</p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton value={getMobileSnippet()} label="Copier le snippet" className="text-secondary" />
              <button
                onClick={() => setMobileSnippet(null)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-highest rounded-lg p-3 mb-3">
            <p className="text-[10px] text-outline uppercase mb-1">Token d'activation</p>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-secondary break-all">{mobileSnippet.token}</span>
              <CopyButton value={mobileSnippet.token} />
            </div>
          </div>

          <div className="bg-surface-highest rounded-lg p-3 mb-3">
            <p className="text-[10px] text-outline uppercase mb-1">Endpoint d'activation</p>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-on-surface">{mobileSnippet.serverInfo.activateUrl}</span>
              <CopyButton value={mobileSnippet.serverInfo.activateUrl} />
            </div>
          </div>

          <div className="bg-surface-highest rounded-lg p-3">
            <p className="text-[10px] text-outline uppercase mb-2">Exemple curl</p>
            <pre className="font-mono text-[11px] text-on-surface-variant whitespace-pre-wrap overflow-x-auto">
              {`curl -X POST ${mobileSnippet.serverInfo.activateUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"token": "${mobileSnippet.token}", "publicKey": "<KEY>", "appVersion": "1.0.0"}'`}
            </pre>
          </div>

          <div className="mt-3 bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-[11px] text-on-surface">
              <span className="font-medium">Comment ça marche:</span> L'app mobile génère une paire de clés RSA 2048, puis appelle cet endpoint avec le token + la clé publique. Le serveur retourne un <code className="text-primary">deviceId</code>, <code className="text-primary">accessToken</code> et <code className="text-primary">refreshToken</code> pour les requêtes suivantes.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <select
          value={selectedTenant}
          onChange={(e) => { setSelectedTenant(e.target.value); setNewTokenValue(null); setMobileSnippet(null); }}
          className="bg-surface-highest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="">Sélectionner un tenant...</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.nom} ({t.id})</option>
          ))}
        </select>
      </div>

      {showFullToken && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-on-surface font-medium">Token complet</p>
            <div className="flex items-center gap-2">
              <CopyButton value={showFullToken} label="Copier" />
              <button
                onClick={() => setShowFullToken(null)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
          <div className="bg-surface-highest rounded-lg p-3 font-mono text-xs text-on-surface break-all">
            {showFullToken}
          </div>
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
              key: 'token-col',
              label: 'Token',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{item.token.slice(0, 20)}...</span>
                  <CopyButton value={item.token} />
                  <button
                    onClick={() => setShowFullToken(showFullToken === item.token ? null : item.token)}
                    className="text-outline hover:text-primary transition-colors"
                    title="Voir le token complet"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                  </button>
                </div>
              ),
            },
            {
              key: 'statut-col',
              label: 'Statut',
              render: (item) => (
                <StatusBadge
                  status={item.statut === 'non_utilise' ? 'active' : item.statut === 'utilise' ? 'info' : 'error'}
                  label={item.statut}
                />
              ),
            },
            {
              key: 'expires-col',
              label: 'Expire le',
              render: (item) => {
                const exp = new Date(item.expiresAt);
                const now = new Date();
                const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
                return (
                  <span className={daysLeft < 30 ? 'text-amber-400' : ''}>
                    {exp.toLocaleDateString()}
                    <span className="text-[10px] text-outline ml-1">({daysLeft}j)</span>
                  </span>
                );
              },
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
                  {item.statut === 'non_utilise' && (
                    <>
                      <button
                        onClick={() => handleCopyForMobile(item.token)}
                        className="text-secondary hover:text-secondary/80 text-xs transition-colors flex items-center gap-0.5"
                        title="Copier le snippet d'activation pour mobile"
                      >
                        <span className="material-symbols-outlined text-[12px]">phone_android</span>
                        Mobile
                      </button>
                      <button
                        onClick={() => handleRevoke(item.token)}
                        className="text-amber-400 hover:text-amber-300 text-xs transition-colors"
                      >
                        Révoquer
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(item.token)}
                    className="text-error hover:text-error/80 text-xs transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              ),
            },
          ]}
          data={tokens}
          emptyMessage={selectedTenant ? 'Aucun token pour ce tenant' : 'Sélectionner un tenant'}
        />
      )}
    </div>
  );
}
