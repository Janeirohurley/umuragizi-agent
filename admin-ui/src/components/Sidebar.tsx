import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/tenants', label: 'Tenants', icon: 'apartment' },
  { to: '/tokens', label: 'Tokens', icon: 'vpn_key' },
  { to: '/devices', label: 'Devices', icon: 'smartphone' },
  { to: '/agents', label: 'Agents', icon: 'psychology' },
  { to: '/usage', label: 'Usage', icon: 'bar_chart' },
  { to: '/security', label: 'Security', icon: 'security' },
  { divider: true, label: 'AMMP' },
  { to: '/providers', label: 'Providers', icon: 'dns' },
  { to: '/models', label: 'Models', icon: 'model_training' },
  { to: '/pools', label: 'Pools', icon: 'account_tree' },
  { to: '/policies', label: 'Policies', icon: 'policy' },
  { to: '/health', label: 'Health', icon: 'monitor_heart' },
  { to: '/logs', label: 'Logs', icon: 'receipt_long' },
  { divider: true, label: 'Système' },
  { to: '/server', label: 'Server Info', icon: 'dns' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-surface-container border-r border-outline-variant flex flex-col z-50">
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary text-xl">shield</span>
        </div>
        <div>
          <h2 className="font-mono text-xs tracking-widest text-primary">Agent Admin</h2>
          <p className="text-on-surface-variant text-[11px]">Enterprise Console</p>
        </div>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3">
        {navItems.map((item, i) => {
          if ('divider' in item && item.divider) {
            return (
              <div key={i} className="text-[10px] font-mono tracking-widest text-outline uppercase px-3 mt-4 mb-2">
                {item.label}
              </div>
            );
          }
          const nav = item as { to: string; label: string; icon: string };
          return (
            <NavLink
              key={nav.to}
              to={nav.to}
              end={nav.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{nav.icon}</span>
              <span>{nav.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">shield</span>
          </div>
          <div>
            <p className="text-xs text-on-surface">Apex Control</p>
            <p className="text-[10px] text-on-surface-variant">Enterprise Console</p>
          </div>
        </div>
      </div>
    </aside>
  );
}