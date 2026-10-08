import React from 'react';
import { Bell, Search, UserCircle } from 'lucide-react';

export default function Header({ title = "Overview" }) {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
      {/* Page Title or Breadcrumb */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <span className="text-xs text-slate-500">Welcome back to Walang-Brownout Control Panel</span>
      </div>

      {/* Right Side Actions & Search */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search items, logs..." 
            className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
          />
        </div>

        {/* Notifications Icon Button */}
        <button className="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-500"></span>
        </button>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm">
            AD
          </div>
          <div className="hidden lg:block text-left">
            <span className="text-xs font-bold text-slate-800 block">Administrator</span>
            <span className="text-[10px] text-slate-500 block">Main Warehouse</span>
          </div>
        </div>
      </div>
    </header>
  );
}