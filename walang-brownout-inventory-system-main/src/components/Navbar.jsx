import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { clearSession } from '../api/sync';
import { 
  LayoutDashboard, Package, FileText, Bell, 
  ShoppingCart, Users, Receipt, Layers, LogOut, X, ShieldAlert, Box
} from 'lucide-react';

export default function Navbar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Dynamic User Session State
  const [currentUser, setCurrentUser] = useState({
    name: 'Justin Ralph',
    email: 'justineralph107@gmail.com',
    role: 'Administrator'
  });

  useEffect(() => {
    const session = localStorage.getItem('current_user');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.name) setCurrentUser(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Dynamic Active Alerts Tracking
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const syncAlerts = () => {
      const savedAlerts = localStorage.getItem('alerts_db');
      if (savedAlerts) {
        try {
          setAlerts(JSON.parse(savedAlerts));
        } catch (e) {
          console.error(e);
        }
      } else {
        setAlerts([]);
      }
    };

    syncAlerts();
    window.addEventListener('storage', syncAlerts);
    window.addEventListener('focus', syncAlerts);

    return () => {
      window.removeEventListener('storage', syncAlerts);
      window.removeEventListener('focus', syncAlerts);
    };
  }, []);

  // Calculate ONLY active, unresolved alerts
  const activeAlertsCount = useMemo(() => {
    return alerts.filter(a => a.status !== 'Resolved').length;
  }, [alerts]);

  const getInitials = (name) => {
    if (!name) return 'WA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      // ignore: we still log out on this device
    }
    clearSession();
    navigate('/');
  };

  const navGroups = [
    { label: 'Overview', items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ]},
    { label: 'Inventory', items: [
      { name: 'Inventory List', path: '/inventory', icon: Package },
      { name: 'Product Details', path: '/product-details', icon: Box },
      { name: 'FIFO Backtracking', path: '/fifo-backtracking', icon: Layers },
      { name: 'Reorder Planner', path: '/reorder-planner', icon: ShoppingCart },
    ]},
    { label: 'Operations', items: [
      { name: 'Transaction Records', path: '/transaction-records', icon: Receipt },
      { name: 'Reports', path: '/reports', icon: FileText },
      { name: 'Alerts', path: '/alerts', icon: Bell, badge: activeAlertsCount },
    ]},
    { label: 'Admin', items: [
      { name: 'User Management', path: '/user-management', icon: Users },
    ]},
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar: always visible on desktop, slides in on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col justify-between overflow-hidden bg-slate-950 text-slate-300 border-r border-white/5 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Glow decorations */}
        <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex-1 overflow-y-auto p-5 space-y-7">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-linear-to-br from-sky-400 to-indigo-600 text-white rounded-2xl shadow-lg shadow-sky-500/40">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white leading-tight tracking-tight">WalangBrownout</h2>
                <p className="text-[10px] font-bold text-sky-300/80 tracking-widest uppercase">Inventory System</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu */}
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold transition ${
                        isActive
                          ? 'bg-linear-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-sky-300'}`} />
                        {item.name}
                      </span>
                      {Number(item.badge) > 0 && (
                        <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow shadow-rose-500/40">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User card */}
        <div className="relative p-4 border-t border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-sky-400 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-lg shadow-sky-500/30">
              {getInitials(currentUser.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[11px] font-medium text-slate-400 truncate">{currentUser.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
