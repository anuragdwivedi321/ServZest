'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FileText, Shield } from 'lucide-react';

export default function TermsPage() {
  const { language } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 text-xs text-slate-700 leading-relaxed">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'hi' ? 'नियम एवं शर्तें' : 'Terms & Conditions'}
        </h1>
        <p className="text-slate-400 text-[11px]">
          Last Updated: 21 September 2026 | ServZest
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">1. Introduction & Acceptance</h2>
          <p>
            Welcome to ServZest ("Platform", "we", "us", "our"). By accessing or using our website, progressive web application (PWA), or mobile services, you agree to be bound by these Terms and Conditions. If you do not agree, please discontinue using the platform.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">2. Nature of Platform</h2>
          <p>
            ServZest operates an on-demand technology marketplace connecting service professionals and customers. The final legal relationship between the operator and professionals must match the signed partner agreement and applicable employment, marketplace, tax, and consumer law.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">3. Bookings, Start OTP & Safety</h2>
          <p>
            Upon successful dispatch, a unique 4-digit Start OTP is generated. The Customer must only share this OTP with the Partner Worker once the worker has arrived at the requested service address. Job commencement without verified OTP is strictly prohibited.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">4. Pricing, Estimates & Approvals</h2>
          <p>
            All baseline visit fees and standard service items follow the published rate card. If a service requires additional tasks or replacement parts, the Partner Worker must submit a digital request through their portal, which requires explicit Customer approval before work commences.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">5. Cancellations & Grace Period</h2>
          <p>
            Customers may cancel any booking free of charge within a 2-minute grace period from the time of assignment. Cancellations after the grace period when a technician has already departed will incur a standard cancellation fee of ₹40 to cover technician travel expenses.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">6. Payments & Settlement</h2>
          <p>
            Payment is due immediately upon job completion. Customers may pay via cash directly to the worker or via UPI through the platform. Any discrepancies should be reported within 24 hours via the Customer Support helpline.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">7. Limitation of Liability</h2>
          <p>
            Professional approval indicates that the platform review steps shown in the app were completed. It is not a guarantee of workmanship or safety. Liability, warranty, insurance and dispute terms will be governed by applicable law and the final customer and partner agreements published by the legal operator.
          </p>
        </section>
      </div>
    </div>
  );
}
