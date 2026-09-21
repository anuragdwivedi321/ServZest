'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Lock } from 'lucide-react';

export default function PrivacyPage() {
  const { language } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 text-xs text-slate-700 leading-relaxed">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
        </h1>
        <p className="text-slate-400 text-[11px]">
          Last Updated: 21 September 2026 | ServZest
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">1. Commitment to Privacy</h2>
          <p>
            ServZest values your trust. This Privacy Policy explains how we collect, process, store, and safeguard your personal data when you use our website, mobile application, or related services.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">2. Information We Collect</h2>
          <ul className="list-disc pl-4 space-y-1 text-slate-600">
            <li><b>Contact Information:</b> Mobile phone number (used for OTP authentication and booking alerts).</li>
            <li><b>Location Data:</b> Precise or approximate GPS coordinates and textual address/landmark entered to facilitate worker navigation and proximity calculation.</li>
            <li><b>Service & Transaction History:</b> Details of services booked, items added, bills, timestamps, ratings, and reviews.</li>
            <li><b>Professional Verification Data:</b> The last four digits of a government ID, consent and review records, trade skills, and vehicle type. Do not upload a full Aadhaar number in this version.</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">3. How We Use Your Information</h2>
          <p>
            We use your information exclusively to:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600">
            <li>Calculate proximity, find an eligible available professional, and show an estimated arrival time.</li>
            <li>Verify accounts and transactions securely via one-time passwords (OTP).</li>
            <li>Enable customer-worker coordination via phone call or in-app status updates.</li>
            <li>Provide customer support, resolve disputes, and maintain platform integrity.</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">4. Data Sharing & Security</h2>
          <p>
            We do not sell, rent, or trade your personal data to third parties for marketing purposes. Your location and contact details are only disclosed to the specific Partner Worker assigned to fulfill your active booking. All data in transit is encrypted using industry-standard TLS protocols.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">5. Retention and Your Choices</h2>
          <p>We keep personal data only for the period needed to provide services, resolve disputes, prevent fraud, meet accounting obligations, and satisfy applicable law. You can download your account data or request account deletion from Account. Active bookings must be closed first. Some completed transaction records may be retained in anonymized or legally required form.</p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-bold text-slate-900 text-sm">6. Privacy and Grievance Contact</h2>
          <p>
            If you have questions regarding your privacy, data deletion, or rights under the Digital Personal Data Protection (DPDP) Act, please contact us at:
          </p>
          <p className="font-medium text-brand-700">Use the Help & Support form in the app. The legal entity name, postal address, grievance officer and monitored privacy email must be published here before public launch.</p>
        </section>
      </div>
    </div>
  );
}
