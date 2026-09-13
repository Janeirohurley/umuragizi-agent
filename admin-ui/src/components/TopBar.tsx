import { useAuth } from '../contexts/AuthContext';

export function TopBar() {
  const { admin, logout } = useAuth();

  return (
    <header className="h-16 bg-surface-container border-b border-outline-variant flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-on-surface-variant text-xl cursor-pointer hover:text-on-surface transition-colors">menu</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg bg-surface-highest flex items-center justify-center hover:bg-surface-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications</span>
        </button>
        <button className="w-9 h-9 rounded-lg bg-surface-highest flex items-center justify-center hover:bg-surface-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">help</span>
        </button>
        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center cursor-pointer">
          <span className="text-on-primary text-sm font-semibold">
            {admin?.username?.charAt(0).toUpperCase() || 'A'}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-outline hover:text-error text-sm transition-colors ml-2"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
