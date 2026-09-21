'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Wrench, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const workspace = user?.role === 'WORKER'
    ? { href: '/worker/dashboard', label: 'Work', Icon: Wrench, active: pathname.startsWith('/worker') }
    : user?.role === 'ADMIN'
    ? { href: '/admin', label: 'Admin', Icon: Shield, active: pathname.startsWith('/admin') }
    : { href: '/history', label: t.history, Icon: History, active: pathname === '/history' || pathname.startsWith('/bookings/') };
  const WorkspaceIcon = workspace.Icon;

  return (
    <nav className="mobile-dock lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-2 flex items-center justify-around shadow-lg">
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 text-xs font-bold transition ${
          pathname === '/' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </Link>

      <Link
        href={workspace.href}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition ${
          workspace.active ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <WorkspaceIcon className="w-5 h-5" />
        <span>{workspace.label}</span>
      </Link>

      <Link
        href="/account"
        className={`flex flex-col items-center gap-1 text-xs font-bold transition ${
          pathname === '/account' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <User className="w-5 h-5" />
        <span>Account</span>
      </Link>
    </nav>
  );
};
