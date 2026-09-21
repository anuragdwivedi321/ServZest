'use client';

import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, LogOut, ShieldCheck, Wrench, Search } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typedPrompt, setTypedPrompt] = useState('');

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 16);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  useEffect(() => {
    const phrases = language === 'hi'
      ? ['“प्लंबर” खोजें', '“इलेक्ट्रीशियन” खोजें', '“एसी रिपेयर” खोजें', '“मैकेनिक” खोजें']
      : ['Search “Plumber”', 'Search “Electrician”', 'Search “AC repair”', 'Search “Mechanic”'];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedPrompt(phrases[0]);
      return;
    }
    let phraseIndex = 0;
    let letterIndex = 0;
    let deleting = false;
    let timer: number;
    const tick = () => {
      const phrase = phrases[phraseIndex];
      letterIndex += deleting ? -1 : 1;
      setTypedPrompt(phrase.slice(0, letterIndex));
      if (!deleting && letterIndex === phrase.length) {
        deleting = true;
        timer = window.setTimeout(tick, 1500);
      } else if (deleting && letterIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        timer = window.setTimeout(tick, 280);
      } else {
        timer = window.setTimeout(tick, deleting ? 42 : 84);
      }
    };
    setTypedPrompt('');
    timer = window.setTimeout(tick, 450);
    return () => window.clearTimeout(timer);
  }, [language]);

  return (
    <header className={`site-header sticky top-0 z-40 bg-[#084c3e] text-white border-b border-white/10 shadow-md ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="reference-header-inner">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <BrandLogo hindi={language === 'hi'} />
        </div>

        {/* Desktop Navigation Links (Screenshot style) */}
        <nav className="reference-header-nav" aria-label="Main navigation">
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
            Home
          </Link>
          <Link href="/#services-grid">
            Services
          </Link>
          <Link href="/login?role=WORKER" aria-current={pathname.startsWith('/worker') ? 'page' : undefined}>
            Professionals
          </Link>
          <Link href="/about" aria-current={pathname === '/about' ? 'page' : undefined}>
            About
          </Link>
          <Link href="/contact" aria-current={pathname === '/contact' ? 'page' : undefined}>
            Contact
          </Link>
        </nav>

        {/* Search stays available on desktop and mobile. */}
        <form className="reference-header-search" action="/" method="get" role="search">
          <span className={`reference-search-prompt ${searchTerm ? 'is-hidden' : ''}`} aria-hidden="true">
            {typedPrompt || (language === 'hi' ? 'सेवा खोजें' : 'Search for a service')}
            <i className="reference-type-caret" />
          </span>
          <input
            type="search"
            name="q"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            maxLength={80}
            aria-label={language === 'hi' ? 'सेवा खोजें' : 'Search services'}
            autoComplete="off"
          />
          <button type="submit" aria-label={language === 'hi' ? 'खोजें' : 'Search services'}><Search size={18} /></button>
        </form>

        {/* Account actions */}
        <div className="reference-header-actions">
          {/* User / Login */}
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold flex items-center gap-1 hover:bg-white/30 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}
              {user.role === 'WORKER' && (
                <Link
                  href="/worker/dashboard"
                  className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold flex items-center gap-1 hover:bg-white/30 transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Worker</span>
                </Link>
              )}
              <Link href="/account" aria-label="Your account" className="p-2 rounded-full text-white hover:bg-white/10 transition">
                <UserIcon className="w-5 h-5" />
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-full text-slate-300 hover:text-red-300 hover:bg-white/10 transition"
                aria-label={t.logout}
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="reference-login"
            >
              <UserIcon className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
