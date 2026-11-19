import React from 'react';
import { Menu, Shield, UserCheck, Briefcase, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { NotificationBell } from '../notifications/NotificationBell.jsx';
import { Button } from '../common/Button.jsx';
import clsx from 'clsx';

export const Header = ({ onMenuClick }) => {
  const { user, quickLogin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Evaluation Helper: Quick Role Switcher Banner */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 px-2">Role Switcher:</span>
          <button
            onClick={() => quickLogin('Admin')}
            className={clsx(
              'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1',
              user?.role === 'Admin'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
          <button
            onClick={() => quickLogin('Manager')}
            className={clsx(
              'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1',
              user?.role === 'Manager'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Manager
          </button>
          <button
            onClick={() => quickLogin('Sales Executive')}
            className={clsx(
              'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1',
              user?.role === 'Sales Executive'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Sales Exec
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Active Role Indicator */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {user?.role} Scope
          </span>
        </div>

        {/* Notification Center */}
        <NotificationBell />

        {/* Profile / Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-900 leading-none">{user?.name}</span>
            <span className="text-[10px] text-slate-500">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
