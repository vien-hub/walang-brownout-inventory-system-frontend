import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  Layers,
  ClipboardList,
  BarChart3,
  Bell,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import api from '../api/axios';
import { clearSession } from '../api/sync';
import { getCurrentUser, getInventory, getStatus } from '../utils/inventory';

// Every path here matches a route in App.jsx.
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventory', icon: Package, also: ['/product-details'] },
  { path: '/fifo-backtracking', label: 'FIFO tracking', icon: RefreshCw },
  { path: '/reorder-planner', label: 'Reorder planner', icon: Layers },
  { path: '/transaction-records', label: 'Transactions', icon: ClipboardList },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/user-management', label: 'Users', icon: Users },
];

function StockPosition() {
  const items = getInventory();
  const critical = items.filter((i) => getStatus(i) === 'Out of Stock').length;
  const low = items.filter((i) => getStatus(i) === 'Low Stock').length;
  const total = Math.max(items.length, 1);
  const segments = 6;
  const redSegs = critical > 0 ? Math.max(1, Math.round((critical / total) * segments)) : 0;
  const amberSegs = low > 0 ? Math.max(1, Math.round((low / total) * segments)) : 0;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">Stock position</span>
        <span className={critical ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
          {critical ? `${critical} critical alert${critical > 1 ? 's' : ''}` : 'All stocked'}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < redSegs ? 'bg-rose-400' : i < redSegs + amberSegs ? 'bg-amber-400' : 'bg-white/15'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Navbar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const initial = (user.name || 'U').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // The token may already be gone; we still clear the session below.
    }
    clearSession();
    navigate('/', { replace: true });
  };

  return (
    <>
      {/* Dark overlay behind the mobile drawer */}
      {isOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`sidebar fixed left-0 top-0 z-50 flex h-screen w-60 flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="m-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <img src="/logo-icon.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-white">Walang Brownout</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Inventory system</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ path, label, icon: Icon, also = [] }) => {
            const active = location.pathname === path || also.includes(location.pathname);
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                  active
                    ? 'nav-active bg-white/10 font-semibold text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <StockPosition />

        {/* Signed-in user */}
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-indigo-500 text-sm font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
