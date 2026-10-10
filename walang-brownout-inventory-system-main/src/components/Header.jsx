import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { getCurrentUser, isActive, loadAlerts } from '../utils/inventory';

function formatNow(date) {
  const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

export default function Header({ title = 'Dashboard', onMenuOpen = () => {} }) {
  const [now, setNow] = useState(() => new Date());
  const [alertCount, setAlertCount] = useState(() => loadAlerts().filter(isActive).length);
  const user = getCurrentUser();

  // Keep the clock and the alert badge fresh.
  useEffect(() => {
    const refresh = () => {
      setNow(new Date());
      setAlertCount(loadAlerts().filter(isActive).length);
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return (
    <header className="app-header sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="rounded-lg border border-slate-300/70 bg-white p-2 text-slate-700 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="truncate text-xs text-slate-600">{formatNow(now)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/alerts"
          className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label={`${alertCount} active alerts`}
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </Link>
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="text-[11px] text-slate-600">{user.role}</p>
        </div>
      </div>
    </header>
  );
}
