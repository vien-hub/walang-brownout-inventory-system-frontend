import React from 'react';

import { Link, useLocation } from 'react-router-dom';

import { 

  LayoutDashboard, 

  Package, 

  RefreshCw, 

  BarChart3, 

  Users, 

  Bell, 

  ShieldAlert,

  ClipboardList,

  Layers

} from 'lucide-react';



export default function Sidebar() {

  const location = useLocation();



  const navItems = [

    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },

    { path: '/inventory', label: 'Inventory Items', icon: Package },

    { path: '/fifo', label: 'FIFO Tracking', icon: RefreshCw },

    { path: '/reorder', label: 'Reorder Planner', icon: Layers },

    { path: '/transactions', label: 'Transaction Logs', icon: ClipboardList },

    { path: '/reports', label: 'Reports', icon: BarChart3 },

    { path: '/users', label: 'User Management', icon: Users },

    { path: '/alerts', label: 'System Alerts', icon: Bell },

  ];



  return (

    <aside className="w-72 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 shadow-sm">

      {/* Brand Header */}

      <div className="p-6 flex items-center gap-3 border-b border-slate-100">

        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">

          <ShieldAlert className="w-5 h-5 text-white" />

        </div>

        <div>

          <h1 className="font-bold tracking-tight text-slate-900 text-sm">Walang-Brownout</h1>

          <span className="text-xs text-sky-600 font-medium">Inventory System</span>

        </div>

      </div>



      {/* Navigation List */}

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">

        {navItems.map((item) => {

          const Icon = item.icon;

          const isActive = location.pathname === item.path;

          return (

            <Link

              key={item.path}

              to={item.path}

              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${

                isActive

                  ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm border border-sky-100'

                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'

              }`}

            >

              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />

              {item.label}

            </Link>

          );

        })}

      </nav>



      {/* Power Status Footer Widget */}

      <div className="p-4 m-4 rounded-2xl bg-slate-50 border border-slate-200/80">

        <div className="flex items-center justify-between mb-2">

          <span className="text-xs font-medium text-slate-500">Power Stability</span>

          <span className="flex h-2 w-2 relative">

            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>

            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>

          </span>

        </div>

        <p className="text-xs font-semibold text-emerald-600">Backup Generation Ready</p>

      </div>

    </aside>

  );

} 