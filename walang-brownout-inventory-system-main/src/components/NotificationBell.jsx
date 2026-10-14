import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertOctagon, AlertTriangle, Clock, PackageX, TrendingUp, Layers, CheckCheck, ChevronRight } from 'lucide-react';
import { getCurrentUser, isActive, loadAlerts, readJSON } from '../utils/inventory';

// Icon + colour for each alert type
const TYPE_STYLE = {
  'Out of Stock': { icon: PackageX, color: 'bg-rose-100 text-rose-600' },
  'Low Stock': { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  'Reorder Point': { icon: Layers, color: 'bg-amber-100 text-amber-600' },
  Overstock: { icon: TrendingUp, color: 'bg-indigo-100 text-indigo-600' },
  'Expiring Soon': { icon: Clock, color: 'bg-amber-100 text-amber-600' },
  Expired: { icon: AlertOctagon, color: 'bg-rose-100 text-rose-600' },
};

// Reads the current alerts and saves them, so every alert keeps a stable
// timestamp and status. It only writes when something really changed.
function readAlerts() {
  const all = loadAlerts();
  const json = JSON.stringify(all);
  if (localStorage.getItem('alerts_db') !== json) localStorage.setItem('alerts_db', json);
  return all.filter(isActive);
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const readKey = `notif_read_${user.id ?? user.email ?? 'user'}`;

  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(readAlerts);
  const [readIds, setReadIds] = useState(() => readJSON(readKey, []));
  const boxRef = useRef(null);

  const refresh = useCallback(() => {
    setAlerts(readAlerts());
    setReadIds(readJSON(readKey, []));
  }, [readKey]);

  // Keep the list fresh
  useEffect(() => {
    const timer = setInterval(refresh, 30000);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const saveRead = (ids) => {
    setReadIds(ids);
    localStorage.setItem(readKey, JSON.stringify(ids));
  };

  const unread = alerts.filter((a) => !readIds.includes(a.id));

  const toggle = () => {
    if (!open) refresh();
    setOpen(!open);
  };

  const openAlert = (alert) => {
    if (!readIds.includes(alert.id)) saveRead([...readIds, alert.id]);
    setOpen(false);
    navigate(`/alerts?open=${encodeURIComponent(alert.id)}`);
  };

  const markAllRead = () => saveRead([...new Set([...readIds, ...alerts.map((a) => a.id)])]);

  const goToAll = () => {
    setOpen(false);
    navigate('/alerts');
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications, ${unread.length} unread`}
        aria-expanded={open}
        className="relative cursor-pointer rounded-xl bg-white p-2.5 text-slate-700 shadow-md hover:bg-slate-100"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold">Notifications</p>
              <p className="text-[11px] font-semibold text-slate-500">
                {unread.length} unread · {alerts.length} active
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread.length === 0}
              className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {alerts.length === 0 && (
              <p className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                No notifications. Stock levels and expiry dates are all within limits.
              </p>
            )}

            {alerts.map((alert) => {
              const style = TYPE_STYLE[alert.type] || TYPE_STYLE['Low Stock'];
              const Icon = style.icon;
              const isUnread = !readIds.includes(alert.id);
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => openAlert(alert)}
                  className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${isUnread ? 'bg-sky-50/50' : ''}`}
                >
                  <span className={`mt-0.5 shrink-0 rounded-lg p-2 ${style.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-xs font-extrabold">{alert.type}</span>
                      {alert.priority === 'Critical' && (
                        <span className="rounded-full bg-rose-600 px-1.5 py-px text-[9px] font-bold text-white">Critical</span>
                      )}
                    </span>
                    <span className="block truncate text-xs font-bold text-slate-800">{alert.item}</span>
                    <span className="block text-[11px] font-medium leading-snug text-slate-500">{alert.details}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{alert.timestamp}</span>
                  </span>
                  {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goToAll}
            className="w-full cursor-pointer border-t border-slate-100 px-4 py-3 text-center text-xs font-extrabold text-sky-700 hover:bg-sky-50"
          >
            View all alerts
          </button>
        </div>
      )}
    </div>
  );
}