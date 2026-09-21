'use client';

import React from 'react';
import { BrandLogo } from './BrandLogo';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Zap, ShieldCheck, Mail, Phone, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { language } = useLanguage();

  return (
    <footer className="site-footer bg-white border-t border-slate-200 mt-12 text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Brand & Mission */}
        <div className="space-y-2">
          <BrandLogo compact />
          <p className="text-slate-500 max-w-sm leading-relaxed">
            {language === 'hi'
              ? 'उपलब्ध कारीगर, स्पष्ट रेट कार्ड और ऐप में बुकिंग अपडेट। आने का समय उपलब्धता, दूरी और ट्रैफिक पर निर्भर है।'
              : 'Available home-service professionals, clear rate cards and in-app booking updates. Arrival estimates depend on availability, distance and traffic.'}
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">
              {language === 'hi' ? 'कंपनी' : 'Company'}
            </p>
            <ul className="space-y-1.5 font-medium">
              <li>
                <Link href="/about" className="hover:text-brand-600 transition">
                  {language === 'hi' ? 'हमारे बारे में (About Us)' : 'About Us'}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-600 transition">
                  {language === 'hi' ? 'संपर्क करें (Contact Us)' : 'Contact Us'}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-brand-600 transition">
                  {language === 'hi' ? 'अक्सर पूछे जाने वाले सवाल (FAQ)' : 'FAQ'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">
              {language === 'hi' ? 'कानूनी' : 'Legal'}
            </p>
            <ul className="space-y-1.5 font-medium">
              <li>
                <Link href="/terms" className="hover:text-brand-600 transition">
                  {language === 'hi' ? 'नियम एवं शर्तें' : 'Terms & Conditions'}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-600 transition">
                  {language === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">
              {language === 'hi' ? 'सहायता' : 'Support'}
            </p>
            <ul className="space-y-1.5 font-medium text-slate-500">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span>Support: use Contact Us</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span>Booking and payment support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Trust & Copyright */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Professionals require admin approval before accepting jobs</span>
          </div>
          <p>© {new Date().getFullYear()} ServZest. Operator details will be published before public launch.</p>
        </div>
      </div>
    </footer>
  );
};
