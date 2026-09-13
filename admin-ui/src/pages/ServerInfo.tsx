import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { ServerInfo as ServerInfoType } from '../api';
import { useToast } from '../contexts/ToastContext';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-outline-variant last:border-b-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-on-surface font-mono">{value}</span>
    </div>
  );
}

function CurlExample({ method, url, body }: { method: string; url: string; body?: string }) {
  const [copied, setCopied] = useState(false);
  const bodyFlag = body ? ` -d '${body}'` : '';
  const curl = `curl -X ${method} "${url}"${bodyFlag}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-surface-highest rounded-lg p-3 font-mono text-xs text-on-surface relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-outline hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100"
      >
        <span className="material-symbols-outlined text-sm">
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
      <pre className="whitespace-pre-wrap break-all pr-6">{curl}</pre>
    </div>
  );
}

export function ServerInfo() {
  const [info, setInfo] = useState<ServerInfoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthCheckResult, setHealthCheckResult] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const { addToast } = useToast();

  const loadInfo = useCallback(async () => {
    try {
      const data = await api.getServerInfo();
      setInfo(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement des infos serveur';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleHealthCheck = async () => {
    setCheckingHealth(true);
    setHealthCheckResult(null);
    try {
      const res = await api.healthCheck();
      setHealthCheckResult(JSON.stringify(res, null, 2));
      addToast('Health check réussi', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Health check échoué';
      setHealthCheckResult(msg);
      addToast(msg, 'error');
    } finally {
      setCheckingHealth(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-outline animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error">Impossible de charger les informations du serveur.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Server Information</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Endpoints, health status, and API reference for the agent platform.
          </p>
        </div>
        <button
          onClick={handleHealthCheck}
          disabled={checkingHealth}
          className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container/80 transition-colors disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-lg ${checkingHealth ? 'animate-spin' : ''}`}>
            {checkingHealth ? 'progress_activity' : 'favorite'}
          </span>
          {checkingHealth ? 'Checking...' : 'Health Check'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Endpoints */}
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant">
            <h3 className="text-on-surface font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">dns</span>
              API Endpoints
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-outline uppercase mb-2">Core Endpoints</h4>
              <div className="space-y-1">
                <InfoRow label="Base URL" value={info.baseUrl} />
                <InfoRow label="Chat Endpoint" value={info.chatUrl} />
                <InfoRow label="Activate Endpoint" value={info.activateUrl} />
              </div>
            </div>
          </div>
        </div>

        {/* cURL Examples */}
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant">
            <h3 className="text-on-surface font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">terminal</span>
              cURL Examples
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs text-on-surface-variant mb-2">Chat Request</p>
              <CurlExample
                method="POST"
                url={info.chatUrl}
                body='{"message": "Bonjour", "tenantId": "xxx"}'
              />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-2">Activate Device</p>
              <CurlExample
                method="POST"
                url={info.activateUrl}
                body='{"deviceId": "xxx", "token": "yyy"}'
              />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-2">Health Check</p>
              <CurlExample method="GET" url={`${info.baseUrl}/health`} />
            </div>
          </div>
        </div>

        {/* Health Check Result */}
        {healthCheckResult && (
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-4 border-b border-outline-variant">
              <h3 className="text-on-surface font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                Health Check Result
              </h3>
            </div>
            <div className="p-4">
              <pre className="bg-surface-highest rounded-lg p-4 text-xs text-on-surface font-mono whitespace-pre-wrap overflow-x-auto">
                {healthCheckResult}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}