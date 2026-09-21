'use client';

import React from 'react';
import { BrandLogo } from './BrandLogo';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Languages, User as UserIcon, LogOut, ShieldCheck, Wrench, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const workspace = user?.role === 'WORKER'
    ? { href: '/worker/dashboard', label: 'Professional workspace', Icon: Wrench }
    : user?.role === 'ADMIN'
    ? { href: '/admin', label: 'Admin workspace', Icon: ShieldCheck }
    : { href: '/history', label: t.history, Icon: UserIcon };

  return (
    <header className="site-header sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
        <BrandLogo hindi={language === 'hi'} />

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
          <Link href="/" className="hover:text-brand-600 transition">
            Home
          </Link>
          <Link href="/#services-grid" className="hover:text-brand-600 transition">
            Services
          </Link>
          <Link href={workspace.href} className="hover:text-brand-600 transition">
            {workspace.label}
          </Link>
          <Link href="/about" className="hover:text-brand-600 transition">
            About Us
          </Link>
          <Link href="/faq" className="hover:text-brand-600 transition">
            FAQ
          </Link>
        </nav>

        {/* Right Actions: Language & Auth */}
        <div className="header-actions flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
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
                  href="/admin"
                  className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1 hover:bg-purple-100 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Admin</span>
                </Link>
              )}
              {user.role === 'WORKER' && (
                <Link
                  href="/worker/dashboard"
                  className="px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold flex items-center gap-1 hover:bg-brand-100 transition"
                >
                  <Wrench className="w-3.5 h-3.5 text-brand-600" />
                  <span>Worker</span>
                </Link>
              )}
              <Link href="/account" aria-label="Your account" className="p-2 rounded-full text-brand-700"><UserIcon className="w-5 h-5" /></Link>
              <button
                onClick={logout}
                className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                aria-label={t.logout} title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-brand-600 text-white hover:bg-brand-700 transition shadow-sm"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>{t.login}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
