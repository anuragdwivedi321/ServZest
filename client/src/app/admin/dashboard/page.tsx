'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { api } from '../../../lib/api';
import { LeafletMap } from '../../../components/map/LeafletMap';
import {
  ShieldCheck,
  Users,
  Calendar,
  Settings,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [tab, setTab] = useState<'METRICS' | 'WORKERS' | 'SETTINGS' | 'BOOKINGS'>('METRICS');
  const [metrics, setMetrics] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [liveWorkers, setLiveWorkers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const [mRes, wRes, lwRes, sRes, bRes] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminWorkers(),
        api.getLiveWorkers(),
        api.getAdminSettings(),
        api.getAllBookings(),
      ]);

      if (mRes.success) setMetrics(mRes.metrics);
      if (wRes.success) setWorkers(wRes.workers);
      if (lwRes.success) setLiveWorkers(lwRes.workers);
      if (sRes.success) setSettings(sRes.settings);
      if (bRes.success) setBookings(bRes.bookings);
    } catch (e) {
      console.error('Error fetching admin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    fetchAllData();
  }, [user]);

  const handleKycAction = async (workerId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await api.updateWorkerKyc(workerId, status);
      if (res.success) {
        alert(res.message);
        fetchAllData();
      }
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateAdminSettings(settings);
      if (res.success) {
        alert('Settings updated successfully');
        setSettings(res.settings);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to update settings');
    }
  };

  const handleAdminCancel = async (bookingId: string) => {
    const reason = prompt('Enter cancellation reason (Admin action):', 'Cancelled by administrator');
    if (!reason) return;

    try {
      const res = await api.adminCancelBooking(bookingId, reason);
      if (res.success) {
        alert(res.message);
        fetchAllData();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading Admin Console...</div>;
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <span>Admin Console</span>
          </h1>
          <p className="text-xs text-gray-500 font-semibold">Real-time marketplace control</p>
        </div>

        <button
          onClick={fetchAllData}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setTab('METRICS')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
            tab === 'METRICS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'
          }`}
        >
          Overview & Map
        </button>
        <button
          onClick={() => setTab('WORKERS')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
            tab === 'WORKERS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'
          }`}
        >
          Workers ({workers.length})
        </button>
        <button
          onClick={() => setTab('SETTINGS')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
            tab === 'SETTINGS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'
          }`}
        >
          Settings & Surge
        </button>
        <button
          onClick={() => setTab('BOOKINGS')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
            tab === 'BOOKINGS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'
          }`}
        >
          Bookings ({bookings.length})
        </button>
      </div>

      {/* Tab: METRICS & LIVE MAP */}
      {tab === 'METRICS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-800">{t.activeWorkers}</span>
              <p className="text-2xl font-black text-emerald-950">{metrics?.onlineWorkers}</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <span className="text-[11px] font-bold text-blue-800">{t.activeBookings}</span>
              <p className="text-2xl font-black text-blue-950">{metrics?.activeBookings}</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
              <span className="text-[11px] font-bold text-purple-800">{t.totalRevenue}</span>
              <p className="text-2xl font-black text-purple-950">₹{metrics?.totalRevenue}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-800">Completed Jobs</span>
              <p className="text-2xl font-black text-amber-950">{metrics?.completedJobs}</p>
            </div>
          </div>

          {/* Live Map of Online Workers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Live Worker Positions (Connaught Place Center)
            </h3>
            <LeafletMap
              center={[28.6139, 77.2090]}
              zoom={13}
              customerLocation={[28.6139, 77.2090]}
              className="h-64 w-full rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            />
          </div>
        </div>
      )}

      {/* Tab: WORKERS & KYC */}
      {tab === 'WORKERS' && (
        <div className="space-y-3">
          {workers.map((w) => (
            <div
              key={w.id}
              className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-gray-900 text-sm">{w.user?.name || 'Worker'}</h4>
                  <p className="text-gray-500 font-mono">+91 {w.user?.phone}</p>
                </div>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    w.kycStatus === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : w.kycStatus === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}
                >
                  {w.kycStatus}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 text-[10px]">
                {w.services?.map((ws: any) => (
                  <span key={ws.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-md">
                    {ws.service?.nameEn}
                  </span>
                ))}
              </div>

              {w.aadhaarNumber && (
                <p className="text-gray-600">
                  Aadhaar: <span className="font-mono font-bold">{w.aadhaarNumber}</span>
                </p>
              )}

              {w.kycStatus === 'PENDING' && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleKycAction(w.id, 'APPROVED')}
                    className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleKycAction(w.id, 'REJECTED')}
                    className="py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: SETTINGS & SURGE */}
      {tab === 'SETTINGS' && (
        <form onSubmit={handleUpdateSettings} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">
              Platform Commission Percentage (%)
            </label>
            <input
              type="number"
              value={settings.platform_commission_pct || 15}
              onChange={(e) => setSettings({ ...settings, platform_commission_pct: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">
              Rush Hour Surge Multiplier (1.0 to 1.5x)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.rush_surge_multiplier || 1.0}
              onChange={(e) => setSettings({ ...settings, rush_surge_multiplier: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">
              Rush Hour Surge Cap (Hard limit)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.rush_surge_cap || 1.5}
              onChange={(e) => setSettings({ ...settings, rush_surge_cap: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">
              Cancellation Fee after 2 mins (₹)
            </label>
            <input
              type="number"
              value={settings.cancel_fee_after_grace || 40}
              onChange={(e) => setSettings({ ...settings, cancel_fee_after_grace: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow transition"
          >
            {t.saveSettings}
          </button>
        </form>
      )}

      {/* Tab: ALL BOOKINGS */}
      {tab === 'BOOKINGS' && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900">{b.service?.nameEn}</span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    b.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : b.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {b.status}
                </span>
              </div>

              <p className="text-gray-600">Customer: <b>{b.customer?.name}</b> ({b.customer?.phone})</p>
              {b.worker && <p className="text-gray-600">Worker: <b>{b.worker.user?.name}</b></p>}
              <p className="text-gray-500 font-mono text-[10px]">Total: ₹{b.totalAmount || b.baseVisitCharge}</p>

              {/* Admin Emergency Cancel (Allowed even for IN_PROGRESS) */}
              {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleAdminCancel(b.id)}
                  className="w-full py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-xl transition mt-1"
                >
                  Admin Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
