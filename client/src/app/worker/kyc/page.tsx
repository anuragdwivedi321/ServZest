'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { api } from '../../../lib/api';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useFeedback } from '../../../context/FeedbackContext';

export default function WorkerKycPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const { notify } = useFeedback();

  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [services, setServices] = useState<any[]>([]);
  const [identityLast4, setIdentityLast4] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [vehicleType, setVehicleType] = useState('Bike');
  const [skills, setSkills] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'WORKER') { router.replace('/login'); return; }
    let cancelled = false;
    setChecking(true); setLoadError('');
    Promise.all([api.getWorkerProfile(), api.getServices()]).then(([saved, catalog]) => {
      if (cancelled) return;
      if (!saved.success || !catalog.success) throw new Error('Could not load verification details. Please retry.');
      setServices(catalog.services);
      const profile = saved.profile;
      if (profile.kycStatus === 'APPROVED') setMessage('Your KYC is approved. You can go online from your dashboard.');
      else if (profile.hasSubmittedKyc && profile.kycStatus === 'PENDING') setMessage('Your KYC has already been submitted. Admin review is pending. You do not need to submit it again.');
      else {
        setMessage('');
        setVehicleType(profile.vehicleType || 'Bike');
        setSkills((profile.skills || []).join(', '));
        setSelectedServiceIds((profile.services || []).map((entry: any) => entry.serviceId));
      }
    }).catch(() => { if (!cancelled) setLoadError('Could not load your saved KYC. Please retry.'); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [user, authLoading, retry]);

  const handleToggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || checking || message) return;
    if (identityLast4.length !== 4 || selectedServiceIds.length === 0 || !consentAccepted) {
      notify('Enter the last 4 digits, select a service and accept the verification consent.', 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitWorkerKyc({
        identityLast4,
        consentAccepted,
        vehicleType,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        serviceIds: selectedServiceIds,
      });

      if (res.success) {
        setMessage('KYC details submitted! Awaiting administrator approval.');

      } else { notify(res.message || 'Submission failed.', 'danger'); }
    } catch (e: any) {
      notify(e.message || 'Submission failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checking) return <p role="status" className="p-8 text-center">Loading your verification status…</p>;
  if (loadError) return <div className="p-8 text-center"><p role="alert">{loadError}</p><button onClick={() => setRetry(value => value + 1)} className="primary-action mt-4">Retry</button></div>;
  return (
    <div className="max-w-2xl mx-auto space-y-5 pt-4 pb-8">
      <div className="text-center space-y-1">
        <ShieldCheck className="w-12 h-12 text-brand-600 mx-auto" />
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Worker KYC & Verification</h1>
        <p className="text-xs text-gray-500 font-medium">
          {message ? 'Your verification status' : 'Submit minimal identity details and select the services you offer'}
        </p>
      </div>

      {message ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 font-bold text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div><p role="status">{message}</p><Link href="/worker/dashboard" className="inline-block mt-4 underline">Back to dashboard →</Link></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Government ID / Aadhaar · last 4 digits only</label>
            <input
              type="text"
              maxLength={4}
              inputMode="numeric"
              value={identityLast4}
              onChange={(e) => setIdentityLast4(e.target.value.replace(/\D/g, ''))}
              placeholder="9012"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
            <input type="checkbox" checked={consentAccepted} onChange={event => setConsentAccepted(event.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>I consent to identity verification for professional onboarding. ServZest stores only the last four digits here; production approval requires an authorized verification provider.</span>
          </label>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Bike">Motorcycle / Scooter</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Commercial Van">Utility Van / Omni</option>
              <option value="None">None (Public Transport / Walking)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Services You Offer (Select Multiple)</label>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {services.map((svc) => {
                const checked = selectedServiceIds.includes(svc.id);
                return (
                  <label
                    key={svc.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                      checked ? 'bg-brand-50 border-brand-500 text-brand-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{svc.nameEn} ({svc.nameHi})</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleService(svc.id)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Specific Skills (Comma separated)</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Fan repair, Wiring, Inverter installation"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Submitting...' : 'Submit for Verification'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
