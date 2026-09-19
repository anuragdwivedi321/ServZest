'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { api } from '../../../lib/api';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function WorkerKycPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [services, setServices] = useState<any[]>([]);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [skills, setSkills] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getServices().then((res) => {
      if (res.success) setServices(res.services);
    });
  }, []);

  const handleToggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aadhaarNumber || selectedServiceIds.length === 0) {
      alert('Please fill Aadhaar number and select at least one service');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitWorkerKyc({
        aadhaarNumber,
        vehicleType,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        serviceIds: selectedServiceIds,
      });

      if (res.success) {
        setMessage('KYC details submitted! Awaiting administrator approval.');
        setTimeout(() => router.push('/worker/dashboard'), 2000);
      }
    } catch (e: any) {
      alert(e.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pt-4 pb-8">
      <div className="text-center space-y-1">
        <ShieldCheck className="w-12 h-12 text-brand-600 mx-auto" />
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Worker KYC & Verification</h1>
        <p className="text-xs text-gray-500 font-medium">
          Upload Aadhaar details and select the services you offer
        </p>
      </div>

      {message ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 font-bold text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Aadhaar Number (12 Digits)</label>
            <input
              type="text"
              maxLength={12}
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1234 5678 9012"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

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
                    onClick={() => handleToggleService(svc.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                      checked ? 'bg-amber-50 border-brand-500 text-brand-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{svc.nameEn} ({svc.nameHi})</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
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
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Submitting...' : 'Submit for Verification'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
