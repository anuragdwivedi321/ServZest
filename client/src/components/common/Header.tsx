'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Languages, User as UserIcon, LogOut, ShieldCheck, Wrench } from 'lucide-react';

export const Header: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'QuickKaam';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
          ⚡
        </div>
        <div>
          <span className="text-xl font-black tracking-tight text-gray-900">{appName}</span>
          <span className="block text-[10px] font-semibold text-brand-600 -mt-1 tracking-wider uppercase">
            {language === 'hi' ? '20 मिनट में कारीगर' : 'In ~20 Mins'}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition"
          title="Switch Language"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{t.switchLang}</span>
        </button>

        {/* User / Login */}
        {user ? (
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && (
              <Link
                href="/admin/dashboard"
                className="p-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            {user.role === 'WORKER' && (
              <Link
                href="/worker/dashboard"
                className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1"
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Worker</span>
              </Link>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full bg-gray-900 text-white hover:bg-black transition shadow-sm"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{t.login}</span>
          </Link>
        )}
      </div>
    </header>
  );
};
