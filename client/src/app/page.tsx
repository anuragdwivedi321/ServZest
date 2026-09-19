'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { Zap, Wrench, HardHat, Cog, AirVent, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

const SERVICE_ICONS: Record<string, any> = {
  electrician: Zap,
  plumber: Wrench,
  majdoor: HardHat,
  mechanic: Cog,
  ac: AirVent,
};

const SERVICE_BG: Record<string, string> = {
  electrician: 'bg-amber-50 text-amber-600 border-amber-200',
  plumber: 'bg-blue-50 text-blue-600 border-blue-200',
  majdoor: 'bg-orange-50 text-orange-600 border-orange-200',
  mechanic: 'bg-slate-50 text-slate-700 border-slate-200',
  ac: 'bg-cyan-50 text-cyan-600 border-cyan-200',
};

export default function HomePage() {
  const { language, t } = useLanguage();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getServices().then((res) => {
      if (res.success) {
        setServices(res.services);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide backdrop-blur">
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'लगभग 20 मिनट में' : 'Within ~20 Mins'}</span>
          </div>
          <h1 className="text-2xl font-black leading-tight tracking-tight">
            {language === 'hi' ? 'घर की कोई भी समस्या? तुरंत कारीगर बुलाएं' : 'Need a Fix at Home? Get Instant Help'}
          </h1>
          <p className="text-amber-100 text-xs font-medium">
            {language === 'hi'
              ? 'पारदर्शी रेट कार्ड • प्रशिक्षित कारीगर • सुरक्षित सेवा'
              : 'Transparent Rates • Verified Workers • No Hidden Charges'}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-15 text-8xl font-black select-none pointer-events-none">
          ⚡
        </div>
      </div>

      {/* Services Grid (Large Buttons for Low-Literacy Users) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">{t.selectService}</h2>
          <span className="text-xs font-semibold text-gray-500">
            {language === 'hi' ? '5 मुख्य सेवाएं' : '5 Core Services'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {services.map((svc) => {
              const Icon = SERVICE_ICONS[svc.slug] || Wrench;
              const colorClass = SERVICE_BG[svc.slug] || 'bg-gray-50 text-gray-700 border-gray-200';
              const name = language === 'hi' ? svc.nameHi : svc.nameEn;

              return (
                <Link
                  key={svc.id}
                  href={`/book/${svc.slug}`}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-brand-500 rounded-2xl shadow-sm hover:shadow-md transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colorClass}`}>
                      <Icon className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-600 transition">
                        {name}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {t.visitCharge}: <span className="font-bold text-gray-800">₹{svc.visitCharge}</span>
                      </p>
                      {svc.items?.length > 0 && (
                        <p className="text-[11px] text-amber-700 font-medium">
                          ₹{svc.items[0].minPrice} - ₹{svc.items[0].maxPrice} ({svc.items[0].nameEn})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-brand-500 group-hover:text-white flex items-center justify-center transition">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Trust & Safety Badges */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
        <div className="text-xs text-emerald-950">
          <p className="font-bold">
            {language === 'hi' ? '100% सत्यापित कारीगर' : '100% Verified Workers'}
          </p>
          <p className="text-emerald-700 mt-0.5">
            {language === 'hi'
              ? 'आधार एवं पृष्ठभूमि जांच के बाद ही काम की अनुमति दी जाती है।'
              : 'Aadhaar-verified & skill-tested professionals with transparent ratings.'}
          </p>
        </div>
      </div>
    </div>
  );
}
