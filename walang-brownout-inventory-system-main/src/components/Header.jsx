import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import NotificationBell from './NotificationBell.jsx';
import { getCurrentUser } from '../utils/inventory';

function formatNow(date) {
  const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

export default function Header({ title = 'Dashboard', onMenuOpen = () => {} }) {
  const [now, setNow] = useState(() => new Date());
  const user = getCurrentUser();

  // Keep the clock fresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-header sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="cursor-pointer rounded-lg border border-white/20 bg-white/10 p-2 text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-xl font-bold tracking-tight text-white">{title}</h2>
          <p className="truncate text-xs text-slate-300">{formatNow(now)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-semibold text-white">{user.name}</p>
          <p className="text-[11px] text-slate-300">{user.role}</p>
        </div>
      </div>
    </header>
  );
}