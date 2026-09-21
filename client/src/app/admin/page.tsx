'use client';

import { AdminOperations } from '../../components/admin/AdminOperations';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useFeedback } from '../../context/FeedbackContext';
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
  LogOut,
  Lock,
  Phone,
  KeyRound,
  ArrowRight,
  Wrench,
  FileText,
  AlertCircle,
  Search,
  Save,
  Check,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, login, logout } = useAuth();
  const { notify, confirmAction, requestText } = useFeedback();

  // Simple Admin Login States
  const [adminPhone, setAdminPhone] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Dashboard States
  const [tab, setTab] = useState<'OVERVIEW' | 'KYC' | 'BOOKINGS' | 'PRICING' | 'COMPLAINTS' | 'OPERATIONS'>('OVERVIEW');
  const [metrics, setMetrics] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Actions
  const [kycFilter, setKycFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [pricingSuccessMsg, setPricingSuccessMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, wRes, bRes, sRes, cRes] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminWorkers(),
        api.getAllBookings(),
        api.getAdminServices(),
        api.getAdminComplaints(),
      ]);

      if (mRes?.success) setMetrics(mRes.metrics);
      if (wRes?.success) setWorkers(wRes.workers);
      if (bRes?.success) setBookings(bRes.bookings);
      if (sRes?.success) setServices(sRes.services);
      for (const result of [mRes,wRes,bRes,sRes,cRes]) if (!result?.success) throw new Error(result?.message || 'Failed to load admin data');
      if (cRes?.success) setComplaints(cRes.complaints);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'Admin data unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle Simple Admin Login
  const handleAdminLogin = async (customPhone?: string, customOtp?: string) => {
    const p = customPhone || adminPhone;
    const o = customOtp || adminOtp;

    setLoginLoading(true);
    setLoginError('');

    try {
      if (customPhone && process.env.NODE_ENV !== 'production') {
        const sent = await api.sendOtp(p);
        if (!sent.success) throw new Error(sent.message || 'Could not send OTP.');
      } else if (!otpSent) throw new Error('Request an OTP first.');
      const res = await api.verifyOtp(p, o);

      if (res.success && res.user) {
        if (res.user.role !== 'ADMIN') {
          setLoginError('This phone number does not have Administrator privileges.');
          setLoginLoading(false);
          return;
        }
        login(res.user);
      } else {
        setLoginError(res.message || 'Login failed. Check OTP.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Network error during login');
    } finally {
      setLoginLoading(false);
    }
  };

  // KYC Approval
  const handleKycAction = async (workerId: string, status: 'APPROVED' | 'REJECTED') => {
    const approved = await confirmAction({
      title: `${status === 'APPROVED' ? 'Approve' : 'Reject'} professional?`,
      message: status === 'APPROVED' ? 'This professional will be allowed to go online and receive customer jobs.' : 'This professional will be taken offline and must resubmit verification details.',
      confirmLabel: status === 'APPROVED' ? 'Approve professional' : 'Reject verification',
      tone: status === 'APPROVED' ? 'info' : 'danger',
    });
    if (!approved) return;
    try {
      const res = await api.updateWorkerKyc(workerId, status);
      if (res.success) {
        fetchAdminData();
      } else {
        notify(res.message || 'Action failed', 'danger');
      }
    } catch (e: any) {
      notify(e.message || 'Failed to update KYC status', 'danger');
    }
  };

  // Pricing Form Update
  const handleSaveServicePricing = async (service: any) => {
    try {
      const res = await api.updateAdminService(service.id, {
        visitCharge: service.visitCharge,
        items: service.items?.map((item: any) => ({
          id: item.id,
          minPrice: item.minPrice,
          maxPrice: item.maxPrice,
        })),
      });

      if (!res.success) throw new Error(res.message || 'Pricing could not be saved.');
      if (res.success) {
        setPricingSuccessMsg(`Pricing for ${service.nameEn} saved successfully!`);
        setTimeout(() => setPricingSuccessMsg(null), 3000);
        fetchAdminData();
      }
    } catch (e: any) {
      notify(e.message || 'Failed to save pricing', 'danger');
    }
  };

  // Local state change for pricing inputs
  const handleVisitChargeChange = (serviceId: string, value: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, visitCharge: value } : s))
    );
  };

  const handleItemPriceChange = (serviceId: string, itemId: string, field: 'minPrice' | 'maxPrice', value: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        return {
          ...s,
          items: s.items.map((i: any) => (i.id === itemId ? { ...i, [field]: value } : i)),
        };
      })
    );
  };

  // Complaint Status Toggle
  const handleToggleComplaint = async (complaintId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN';
    try {
      const res = await api.updateComplaintStatus(complaintId, nextStatus);
      if (!res.success) throw new Error(res.message || 'Could not update complaint.');
      if (res.success) {
        fetchAdminData();
      }
    } catch (e: any) {
      notify(e.message || 'Failed to update complaint status', 'danger');
    }
  };

  // Admin Cancel Booking
  const handleAdminCancel = async (bookingId: string) => {
    const reason = await requestText({ title: 'Cancel this booking?', message: 'This action stops dispatch or the active service. Add a reason for the audit trail.', defaultValue: 'Cancelled by administrator', confirmLabel: 'Cancel booking', tone: 'danger' });
    if (!reason) return;

    try {
      const res = await api.adminCancelBooking(bookingId, reason);
      if (!res.success) throw new Error(res.message || 'Could not cancel booking.');
      if (res.success) {
        fetchAdminData();
      }
    } catch (e: any) {
      notify(e.message || 'Failed to cancel', 'danger');
    }
  };

  // ==========================================
  // RENDER LOGIN SCREEN (IF NOT ADMIN)
  // ==========================================
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
              <ShieldCheck className="w-8 h-8 text-brand-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ServZest Admin Portal</h1>
            <p className="text-xs text-slate-500 font-medium">
              Authorized access only. Sign in with administrator credentials.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                Admin Mobile Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={adminPhone}
                  onChange={(e) => { setAdminPhone(e.target.value.replace(/\D/g, '')); setOtpSent(false); setAdminOtp(''); setOtpMessage(''); }}
                  placeholder="Registered admin mobile"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <button type="button" disabled={loginLoading || !/^[6-9]\d{9}$/.test(adminPhone)} className="w-full py-3 border rounded-xl font-bold disabled:opacity-50" onClick={async () => {
              setLoginLoading(true); setLoginError('');
              try { const result = await api.sendOtp(adminPhone); if (!result.success) throw new Error(result.message); setOtpSent(true); setOtpMessage(result.message); }
              catch (error: any) { setLoginError(error.message || 'Could not send OTP.'); }
              finally { setLoginLoading(false); }
            }}>{otpSent ? 'Resend OTP' : 'Send OTP'}</button>
            {otpMessage && <p role="status">{otpMessage}</p>}
            <div>
              <label className="font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                Security Code / OTP
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={adminOtp}
                  onChange={(e) => setAdminOtp(e.target.value)}
                  placeholder="Enter received OTP"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-center"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {loginError}
              </p>
            )}

            <button
              onClick={() => handleAdminLogin()}
              disabled={loginLoading}
              className="w-full py-3.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <span>{loginLoading ? 'Authenticating...' : 'Sign In to Admin Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo One-Click Login Button */}
            {process.env.NODE_ENV !== 'production' && <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleAdminLogin('9999999999', '123456')}
                disabled={loginLoading}
                className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>⚡ Quick Login as Demo Admin (9999999999)</span>
              </button>
            </div>}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER ADMIN DASHBOARD
  // ==========================================
  const pendingKycCount = workers.filter((w) => w.kycStatus === 'PENDING').length;
  const openComplaintsCount = complaints.filter((c) => c.status === 'OPEN').length;

  const filteredWorkers = workers.filter((w) => {
    if (kycFilter === 'PENDING') return w.kycStatus === 'PENDING';
    if (kycFilter === 'APPROVED') return w.kycStatus === 'APPROVED';
    if (kycFilter === 'REJECTED') return w.kycStatus === 'REJECTED';
    return true;
  });

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'ACTIVE') return !['COMPLETED', 'CANCELLED', 'NO_PROVIDER'].includes(b.status);
    if (bookingFilter === 'COMPLETED') return b.status === 'COMPLETED';
    if (bookingFilter === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Admin Navigation Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>ServZest Admin Console</span>
              <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 text-[10px] font-bold rounded-md border border-brand-500/30">
                ADMIN
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Administrator: <span className="text-slate-200 font-semibold">{user.name || 'Admin'} (+91 {user.phone})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={logout}
            className="px-3.5 py-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-sm text-xs font-bold">
        <button
          onClick={() => setTab('OVERVIEW')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'OVERVIEW' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. Overview</span>
        </button>

        <button
          onClick={() => setTab('KYC')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'KYC' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>2. Worker KYC Approval</span>
          {pendingKycCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full font-black">
              {pendingKycCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('BOOKINGS')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'BOOKINGS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>3. Bookings Monitor</span>
          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 text-[10px] rounded-full">
            {bookings.length}
          </span>
        </button>

        <button
          onClick={() => setTab('PRICING')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'PRICING' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>4. Services & Pricing</span>
        </button>

        <button
          onClick={() => setTab('COMPLAINTS')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            tab === 'COMPLAINTS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>5. Complaints & Support</span>
          {openComplaintsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-black">
              {openComplaintsCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. OVERVIEW TAB                                           */}
      {/* ========================================================= */}
      <button onClick={() => setTab('OPERATIONS')} className="px-4 py-2 rounded-xl border bg-white font-bold">Support, customers, live map & settings</button>
      {tab === 'OPERATIONS' && <AdminOperations />}
      {tab === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* 4 Primary Big Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-black text-slate-900">{metrics?.totalUsers || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Registered customers & workers</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Workers</span>
                <Wrench className="w-5 h-5 text-brand-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{metrics?.totalWorkers || workers.length}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-600 font-bold">{metrics?.onlineWorkers || 0} Online</span> &bull; {pendingKycCount} Pending KYC
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Bookings</span>
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{metrics?.totalBookings || bookings.length}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                <span className="text-brand-600 font-bold">{metrics?.activeBookings || 0} Active</span> &bull; {metrics?.completedJobs || 0} Completed
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Commission due</span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-emerald-600">₹{metrics?.totalRevenue || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                GMV: ₹{metrics?.totalGrossVolume || 0} (Confirmed customer payments)
              </p>
            </div>
          </div>

          {/* Quick Metrics & System Health Strip */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Marketplace Real-Time Health</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-500 block">Online Workers</span>
                <span className="text-lg font-black text-emerald-600">{metrics?.onlineWorkers || 0} Active</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-500 block">Live In-Progress Jobs</span>
                <span className="text-lg font-black text-brand-600">{metrics?.activeBookings || 0} Jobs</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-500 block">Open Support Tickets</span>
                <span className={`text-lg font-black ${openComplaintsCount > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {openComplaintsCount} Tickets
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-500 block">Pending KYC Reviews</span>
                <span className={`text-lg font-black ${pendingKycCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {pendingKycCount} Workers
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. WORKER KYC APPROVAL TAB                                */}
      {/* ========================================================= */}
      {tab === 'KYC' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900">Worker Registrations & KYC</h2>
              <p className="text-xs text-slate-500">Review professional identity intake and selected service categories.</p>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setKycFilter(f)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    kycFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-500 font-bold">
              No workers found matching &ldquo;{kycFilter}&rdquo; status.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3.5">Worker Name</th>
                      <th className="p-3.5">Phone</th>
                      <th className="p-3.5">Service Categories</th>
                      <th className="p-3.5">Identity intake</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWorkers.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-900">
                          {w.user?.name || 'Worker'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          +91 {w.user?.phone}
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {w.services?.map((ws: any) => (
                              <span
                                key={ws.id}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold"
                              >
                                {ws.service?.nameEn}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {w.maskedAadhaar || 'Not provided'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                              w.kycStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : w.kycStatus === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {w.kycStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {w.kycStatus !== 'APPROVED' && (
                              <button
                                onClick={() => handleKycAction(w.id, 'APPROVED')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                              >
                                Approve
                              </button>
                            )}
                            {w.kycStatus !== 'REJECTED' && (
                              <button
                                onClick={() => handleKycAction(w.id, 'REJECTED')}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BOOKINGS MONITOR TAB                                    */}
      {/* ========================================================= */}
      {tab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900">Bookings Monitor</h2>
              <p className="text-xs text-slate-500">Live view of customer requests, assigned workers, and billing status.</p>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    bookingFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">Service</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Worker</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-slate-400 font-bold">
                        #{b.id.slice(0, 8)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {b.service?.nameEn}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-800">{b.customer?.name || 'Customer'}</p>
                        <p className="text-[11px] text-slate-500 font-mono">+91 {b.customer?.phone}</p>
                      </td>
                      <td className="p-3.5">
                        {b.worker ? (
                          <>
                            <p className="font-bold text-slate-800">{b.worker.user?.name || 'Partner'}</p>
                            <p className="text-[11px] text-slate-500 font-mono">+91 {b.worker.user?.phone}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Searching...</span>
                        )}
                      </td>
                      <td className="p-3.5 font-black text-slate-900">
                        ₹{b.totalAmount || b.baseVisitCharge}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-brand-50 border border-brand-200 text-brand-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleAdminCancel(b.id)}
                            className="px-2.5 py-1 text-[11px] border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg transition"
                          >
                            Admin Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SERVICE & PRICING MANAGEMENT TAB                        */}
      {/* ========================================================= */}
      {tab === 'PRICING' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Service Categories & Pricing</h2>
            <p className="text-xs text-slate-500">
              Configure base visit charges and itemized rate cards (min/max price limits) for each service.
            </p>
          </div>

          {pricingSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{pricingSuccessMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 text-xs"
              >
                {/* Service Header & Visit Charge Input */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{svc.nameEn} ({svc.nameHi})</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Slug: {svc.slug}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-700">Base Visit Charge (₹):</label>
                    <input
                      type="number"
                      value={svc.visitCharge}
                      onChange={(e) => handleVisitChargeChange(svc.id, parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Items & Price Ranges */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                    Itemized Rate Card (Min & Max Prices)
                  </span>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {svc.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="max-w-xs">
                          <p className="font-bold text-slate-800">{item.nameEn}</p>
                          <p className="text-[11px] text-slate-400">{item.nameHi}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[11px]">Min ₹</span>
                            <input
                              type="number"
                              value={item.minPrice}
                              onChange={(e) =>
                                handleItemPriceChange(svc.id, item.id, 'minPrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-xs text-center"
                            />
                          </div>

                          <span className="text-slate-400">&ndash;</span>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[11px]">Max ₹</span>
                            <input
                              type="number"
                              value={item.maxPrice}
                              onChange={(e) =>
                                handleItemPriceChange(svc.id, item.id, 'maxPrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-xs text-center"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveServicePricing(svc)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save {svc.nameEn} Pricing</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. COMPLAINTS & SUPPORT TAB                               */}
      {/* ========================================================= */}
      {tab === 'COMPLAINTS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Complaints & Customer Support</h2>
            <p className="text-xs text-slate-500">Track and resolve customer complaints, safety incidents, and disputes.</p>
          </div>

          {complaints.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-500 font-bold">
              No customer complaints filed yet. Great job!
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3.5">ID & Date</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Service / Booking</th>
                      <th className="p-3.5">Reported Issue</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <p className="font-mono text-slate-400 font-bold">#{c.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-800">{c.user?.name || 'Customer'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">+91 {c.user?.phone}</p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-800">{c.booking?.service?.nameEn}</p>
                          <p className="text-[11px] text-slate-400 font-mono">#{c.bookingId.slice(0, 8)}</p>
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-xs font-medium">
                          {c.issue}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                              c.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800 animate-pulse'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleToggleComplaint(c.id, c.status)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                              c.status === 'OPEN'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {c.status === 'OPEN' ? 'Mark Resolved' : 'Reopen'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
