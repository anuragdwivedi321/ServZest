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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-6 py-2 flex items-center justify-around shadow-lg sm:max-w-md sm:mx-auto sm:rounded-t-2xl">
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 text-xs font-semibold ${
          pathname === '/' ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </Link>

      <Link
        href="/history"
        className={`flex flex-col items-center gap-1 text-xs font-semibold ${
          pathname === '/history' ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <History className="w-5 h-5" />
        <span>{t.history}</span>
      </Link>

      {/* Role-specific quick link */}
      {user?.role === 'WORKER' && (
        <Link
          href="/worker/dashboard"
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            pathname.startsWith('/worker') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span>Worker</span>
        </Link>
      )}

      {user?.role === 'ADMIN' && (
        <Link
          href="/admin/dashboard"
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            pathname.startsWith('/admin') ? 'text-purple-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Admin</span>
        </Link>
      )}

      <Link
        href={user ? '/history' : '/login'}
        className={`flex flex-col items-center gap-1 text-xs font-semibold ${
          pathname === '/login' ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <User className="w-5 h-5" />
        <span>{user ? 'Account' : t.login}</span>
      </Link>
    </nav>
  );
};
