'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { Phone, KeyRound, ArrowRight, CheckCircle2, UserRound, Wrench, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language, t } = useLanguage();

  const [name, setName] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'WORKER'>('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const handleSendOtp = async (targetPhone?: string) => {
    if (!role) return;
    if (!consentAccepted) { setError('Please accept the Terms of Service and Privacy Policy.'); return; }
    const p = targetPhone || phone;
    if (!/^[6-9]\d{9}$/.test(p)) {
      setError(language === 'hi' ? 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें' : 'Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.sendOtp(p);
      if (res.success) {
        setMessage(res.message);
        setPhone(p);
        setStep('OTP');
      } else {
        setError(res.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!role) return;
    if (!otp) {
      setError('Please enter OTP');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.verifyOtp(phone, otp, name.trim() || undefined, role, consentAccepted);
      if (res.success && res.user) {
        if (res.user.role !== role) {
          setError(res.user.role === 'ADMIN' ? 'This is an admin account. Choose Admin Login.' : res.user.role === 'WORKER' ? 'This number belongs to an employee account. Choose Employee Login and request a new OTP.' : 'This number belongs to a customer account. Choose Customer Login and request a new OTP.');
          return;
        }
        login(res.user);

        const next = new URLSearchParams(window.location.search).get('next');
        const safeCustomerDestination = next && (/^\/book\/[a-z0-9-]+$/.test(next) || next === '/history' || next === '/account');
        if (role === 'CUSTOMER' && safeCustomerDestination) {
          router.push(next);
          return;
        }

        // Role-based redirection
        if (res.user.role === 'ADMIN') {
          router.push('/admin');
        } else if (res.user.role === 'WORKER') {
          router.push('/worker/dashboard');
        } else {
          router.push('/');
        }
      } else {
        setError(res.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const chooseRole = (next: 'CUSTOMER' | 'WORKER') => {
    setRole(next); setStep('PHONE'); setOtp(''); setMessage(''); setError('');
  };

  return (
    <div className="signin-shell">
      <aside className="signin-story">
        <span className="signin-kicker">SERVZEST · AT YOUR SERVICE</span>
        <h1>Less hassle.<br/><span>More living.</span></h1>
        <p>A helping hand for your home. A new opportunity for your skills. It all starts here.</p>
        <div className="signin-art" aria-hidden="true"><div className="signin-art-ring"/><div className="signin-art-home">⌂</div><span className="signin-art-tool"><Wrench size={32}/></span><span className="signin-art-check"><CheckCircle2 size={30}/></span></div>
        <div className="signin-story-foot"><ShieldCheck size={20}/>Your home. In good hands.</div>
      </aside>
      <section className="signin-panel" aria-label="Sign in">
        <div className="signin-progress"><span className={step==='PHONE'?'active':''}>01 · Mobile number</span><span className={step==='OTP'?'active':''}>02 · Verification</span></div>
        <h2 aria-live="polite">{step==='PHONE' ? (role === 'WORKER' ? 'Employee login' : 'Customer login') : (role === 'WORKER' ? 'Verify employee number' : 'Verify customer number')}</h2>
        <p className="signin-subtitle">{role === 'WORKER' ? 'Enter your employee mobile number to access jobs, KYC and earnings. Use a different number from your customer account.' : 'Enter your customer mobile number to book and track home services.'}</p>
        <div className="signin-roles" aria-label="Choose login section">
          <button type="button" disabled={loading} aria-pressed={role==='CUSTOMER'} onClick={()=>chooseRole('CUSTOMER')}><UserRound size={18}/>Customer</button>
          <button type="button" disabled={loading} aria-pressed={role==='WORKER'} onClick={()=>chooseRole('WORKER')}><Wrench size={18}/>Employee</button>
        </div>
        <p className="signin-role-help">{role==='CUSTOMER' ? 'Book a service. Track every step.' : 'Accept jobs and manage your earnings.'}</p>
      {/* Form Container */}
      {role && <div className="space-y-4">
        {step === 'PHONE' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.phone}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-slate-500">+91</span>
                <input
                  aria-label="Mobile number" autoComplete="tel-national" inputMode="numeric" type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                />
              </div>
            </div>

<label className="block text-sm">Name (optional, for new accounts)<input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="border p-3 rounded-xl w-full mt-1" /></label>
            <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={consentAccepted} onChange={event => setConsentAccepted(event.target.checked)} /><span>I agree to the <a className="underline" href="/terms">Terms of Service</a> and acknowledge the <a className="underline" href="/privacy">Privacy Policy</a>.</span></label>
            <button
              onClick={() => handleSendOtp()}
              disabled={loading || phone.length < 10 || !consentAccepted}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Sending...' : role === 'WORKER' ? 'Continue as Employee' : 'Continue as Customer'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl text-xs text-brand-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{message}</p>
                <p className="text-[11px] text-brand-700 mt-0.5">Phone: +91 {phone}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.enterOtp}
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 w-5 h-5 text-slate-400" />
                <input
                  aria-label="One-time password" autoComplete="one-time-code" inputMode="numeric" type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg tracking-widest font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-center"
                />
              </div>
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 4}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Verifying...' : t.verifyOtp}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep('PHONE')}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Change Phone Number
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl text-center border border-red-200">
            {error}
          </p>
        )}
      </div>}
        <p className="signin-legal">Read our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
        <div className="signin-admin"><ShieldCheck size={17}/><span>Company team?</span><button type="button" disabled={loading} onClick={()=>router.push('/admin')}>Admin login <ArrowRight size={14}/></button></div>
      </section>
    </div>
  );
}
