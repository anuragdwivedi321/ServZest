'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { Phone, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language, t } = useLanguage();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendOtp = async (targetPhone?: string) => {
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
    if (!otp) {
      setError('Please enter OTP');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.verifyOtp(phone, otp);
      if (res.success && res.token) {
        login(res.token, res.user);

        // Role-based redirection
        if (res.user.role === 'ADMIN') {
          router.push('/admin/dashboard');
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

  const quickLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    handleSendOtp(demoPhone);
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="text-center space-y-1">
        <div className="w-16 h-16 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-lg">
          ⚡
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight pt-2">{t.login}</h1>
        <p className="text-xs text-gray-500 font-medium">
          {language === 'hi'
            ? 'मोबाइल नंबर से सुरक्षित व त्वरित लॉग इन'
            : 'Fast & Secure Phone Verification via OTP'}
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
        {step === 'PHONE' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.phone}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-gray-500">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full pl-14 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                />
              </div>
            </div>

            <button
              onClick={() => handleSendOtp()}
              disabled={loading || phone.length < 10}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Sending...' : t.sendOtp}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{message}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Phone: +91 {phone}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.enterOtp}
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-lg tracking-widest font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-center"
                />
              </div>
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 4}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Verifying...' : t.verifyOtp}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setStep('PHONE')}
              className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-900"
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
      </div>

      {/* Demo Quick-Fill Profiles */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
          Demo Quick Logins (Pre-seeded)
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => quickLogin('9876543210')}
            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition flex items-center justify-between text-xs"
          >
            <div>
              <p className="font-bold text-blue-900">Rahul Sharma (Customer)</p>
              <p className="text-blue-700 font-mono">+91 9876543210</p>
            </div>
            <span className="font-bold text-blue-600">Login &rarr;</span>
          </button>

          <button
            onClick={() => quickLogin('9811100001')}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition flex items-center justify-between text-xs"
          >
            <div>
              <p className="font-bold text-emerald-900">Ramesh Kumar (Worker - Electrician)</p>
              <p className="text-emerald-700 font-mono">+91 9811100001</p>
            </div>
            <span className="font-bold text-emerald-600">Login &rarr;</span>
          </button>

          <button
            onClick={() => quickLogin('9999999999')}
            className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl text-left transition flex items-center justify-between text-xs"
          >
            <div>
              <p className="font-bold text-purple-900">Admin User</p>
              <p className="text-purple-700 font-mono">+91 9999999999</p>
            </div>
            <span className="font-bold text-purple-600">Login &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
