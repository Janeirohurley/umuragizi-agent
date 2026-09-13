import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Tenants } from './pages/Tenants';
import { Tokens } from './pages/Tokens';
import { Devices } from './pages/Devices';
import { Logs } from './pages/Logs';
import { Providers } from './pages/Providers';
import { ModelsPage } from './pages/Models';
import { Pools } from './pages/Pools';
import { Health } from './pages/Health';
import { Agents } from './pages/Agents';
import { Usage } from './pages/Usage';
import { Security } from './pages/Security';
import { Policies } from './pages/Policies';
import { ServerInfo } from './pages/ServerInfo';
import { TenantDetail } from './pages/TenantDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-outline animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/tenants/:tenantId" element={<TenantDetail />} />
              <Route path="/tokens" element={<Tokens />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/usage" element={<Usage />} />
              <Route path="/security" element={<Security />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/pools" element={<Pools />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/health" element={<Health />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/server" element={<ServerInfo />} />
            </Routes>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}