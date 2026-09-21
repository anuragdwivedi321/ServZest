'use client';

import { WorkerPayments } from '../../../components/worker/WorkerPayments';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useSocket } from '../../../context/SocketContext';
import { api } from '../../../lib/api';
import { useFeedback } from '../../../context/FeedbackContext';
import {
  Power,
  Navigation,
  KeyRound,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  MapPin,
  X,
  Send,
} from 'lucide-react';

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const { socket } = useSocket();
  const { notify, confirmAction } = useFeedback();

  const [error, setError] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [statusPending, setStatusPending] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Incoming Request State (30s countdown)
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [countdown, setCountdown] = useState(30);

  // Modals
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [startOtp, setStartOtp] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [isPart, setIsPart] = useState(false);

  // Earnings
  const [earnings, setEarnings] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.getWorkerProfile();
      if (res.success) {
        setError('');
        setProfile(res.profile);
        setIsOnline(res.profile.isOnline);
        setActiveBooking(res.activeBooking);
        setIncomingRequest(res.incomingRequest);
        if (res.incomingRequest) setCountdown(res.incomingRequest.timeoutSec);
      } else { setError(res.message || 'Worker profile unavailable.'); }
      const earnRes = await api.getWorkerEarnings();
      if (earnRes.success) {
        setEarnings(earnRes);
      }
      const subscriptionRes = await api.getWorkerSubscription();
      if (subscriptionRes.success) setSubscription(subscriptionRes);
    } catch (e) {
      setError('Could not refresh your dashboard. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'WORKER') {
      router.push('/login');
      return;
    }
    fetchProfile();
    const poll = setInterval(fetchProfile, 10000);
    return () => clearInterval(poll);
  }, [user, authLoading]);

  useEffect(() => {
    if (!socket || !profile?.id) return;
    const join = () => { socket.emit('join_worker', { workerId: profile.id }); if (activeBooking?.id) socket.emit('join_booking', { bookingId: activeBooking.id }); };
    const request = (data: any) => { setIncomingRequest(data); setCountdown(data.timeoutSec || 30); };
    const refresh = () => { void fetchProfile(); };
    join(); socket.on('connect', join); socket.on('worker:new_request', request);
    socket.on('booking:status_update', refresh); socket.on('booking:extra_item_response', refresh); socket.on('booking:payment_update', refresh);
    const gps = () => { if (!isOnline && !activeBooking) return; if (!navigator.geolocation) { setGpsError('GPS is unavailable. Location is required for matching.'); return; }
      navigator.geolocation.getCurrentPosition(pos => { setGpsError(''); socket.emit('worker:location_update', { lat: pos.coords.latitude, lng: pos.coords.longitude }); }, () => setGpsError('Allow location access to receive nearby jobs. Your location is not being shared.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }); };
    gps(); const timer = setInterval(gps, 10000);
    return () => { clearInterval(timer); socket.off('connect', join); socket.off('worker:new_request', request); socket.off('booking:status_update', refresh); socket.off('booking:extra_item_response', refresh); socket.off('booking:payment_update', refresh); if (activeBooking?.id) socket.emit('leave_booking', { bookingId: activeBooking.id }); };
  }, [socket, profile?.id, isOnline, activeBooking?.id]);

  // 30-Second Countdown Timer
  useEffect(() => {
    if (!incomingRequest) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIncomingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest]);

  const handleToggleOnline = async () => {
    if (statusPending || (!isOnline && profile?.kycStatus !== 'APPROVED')) return;
    setStatusPending(true); setError('');
    try {
      const res = await api.toggleWorkerOnline(!isOnline);
      if (res.success) setIsOnline(res.isOnline);
      else setError(res.message || 'Could not change status');
    } catch (e: any) { setError(e.message || 'Could not change status'); }
    finally { setStatusPending(false); }
  };

  const handleAcceptJob = async () => {
    if (!incomingRequest) return;
    try {
      const res = await api.acceptBooking(incomingRequest.bookingId);
      if (res.success) {
        setIncomingRequest(null);
        fetchProfile();
      } else {
        notify(res.message || 'This offer is no longer available.', 'danger');
        setIncomingRequest(null);
      }
    } catch (e: any) {
      notify(e.message || 'Accept failed', 'danger');
    }
  };

  const handleRejectJob = async () => {
    if (!incomingRequest) return;
    try {
      const result = await api.rejectBooking(incomingRequest.bookingId);
      if (!result.success) throw new Error(result.message || 'Could not decline this offer.');
      setIncomingRequest(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (status: 'EN_ROUTE' | 'ARRIVED') => {
    if (!activeBooking) return;
    try {
      const res = await api.updateWorkerStatus(activeBooking.id, status);
      if (res.success) {
        fetchProfile();
      } else { notify(res.message || 'Action failed.', 'danger'); }
    } catch (e: any) {
      notify(e.message || 'Action failed.', 'danger');
    }
  };

  const handleStartBooking = async () => {
    if (!activeBooking || !startOtp) return;
    try {
      const res = await api.startBooking(activeBooking.id, startOtp);
      if (res.success) {
        setShowOtpModal(false);
        setStartOtp('');
        fetchProfile();
      } else {
        notify(res.message || 'Invalid start OTP', 'danger');
      }
    } catch (e: any) {
      notify(e.message || 'Failed to start booking', 'danger');
    }
  };

  const handleAddItem = async () => {
    if (!activeBooking || !itemDesc || !itemPrice) return;
    try {
      const res = await api.addBillItem(activeBooking.id, {
        description: itemDesc,
        unitPrice: parseFloat(itemPrice),
        quantity: 1,
        isPart,
      });
      if (res.success) {
        setShowAddItemModal(false);
        setItemDesc('');
        setItemPrice('');
        fetchProfile();
        notify('Item sent to the customer for approval.', 'success');
      } else { notify(res.message || 'Could not add this item.', 'danger'); }
    } catch (e: any) {
      notify(e.message || 'Failed to add item', 'danger');
    }
  };

  const handleCompleteBooking = async () => {
    if (!activeBooking) return;
    const approved = await confirmAction({ title: 'Complete this job?', message: 'Make sure the work is finished and every extra item has been approved by the customer.', confirmLabel: 'Complete job' });
    if (!approved) return;
    try {
      const res = await api.completeBooking(activeBooking.id);
      if (res.success) {
        notify(`Job completed. Final bill ₹${res.bill.totalAmount}; your earning ₹${res.bill.workerEarnings}.`, 'success');
        fetchProfile();
      } else { notify(res.message || 'Could not complete this job.', 'danger'); }
    } catch (e: any) {
      notify(e.message || 'Failed to complete job', 'danger');
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading Worker Console...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {error && <p role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl">{error} <button type="button" onClick={()=>void fetchProfile()} className="underline font-bold ml-2">Retry</button></p>}
      {gpsError && <p role="alert" className="p-4 bg-amber-50 text-amber-900 rounded-xl">{gpsError}</p>}

<div className="flex items-center justify-between gap-3"><div><p className="eyebrow">YOUR WORKSPACE</p><h2 className="text-2xl font-bold text-brand-800">Professional dashboard</h2></div><Link href="/contact" className="secondary-action">Get help</Link></div>
      {/* Worker Header & Online Toggle */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {profile?.user?.name || 'Worker Console'}
            </h1>
            <p className="text-xs text-gray-500 font-semibold">
              {profile?.totalRatings > 0 ? `★ ${profile.rating} (${profile.totalRatings} reviews)` : 'New professional · No reviews yet'}
            </p>
          </div>

          <button
            onClick={handleToggleOnline}
            disabled={statusPending || (!isOnline && profile?.kycStatus !== 'APPROVED')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-black text-xs transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{statusPending ? 'Updating…' : isOnline ? t.goOffline : profile?.kycStatus !== 'APPROVED' ? 'Approval required' : t.goOnline}</span>
          </button>
        </div>

        {profile?.kycStatus !== 'APPROVED' && (
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-between text-xs text-brand-900">
            <span><b>{profile?.kycStatus === 'REJECTED' ? 'Verification needs attention' : profile?.hasSubmittedKyc ? 'KYC submitted · Awaiting admin approval' : 'Complete your verification'}</b><span className="block mt-1">{profile?.hasSubmittedKyc && profile?.kycStatus === 'PENDING' ? 'Your details are saved. No need to submit again. You can receive jobs after approval.' : 'Review your identity intake and service categories. Admin approval is required to receive jobs.'}</span></span>
            <Link href="/worker/kyc" className="font-bold underline text-brand-700">
              {profile?.hasSubmittedKyc && profile?.kycStatus === 'PENDING' ? 'View status →' : 'Review KYC →'}
            </Link>
          </div>
        )}
      </div>

      {profile && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Professional subscription and commission">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-brand-700">Professional plan</p><h2 className="mt-1 text-lg font-black text-slate-950">{subscription?.subscription?.plan?.name || 'No active subscription'}</h2><p className="mt-1 text-xs text-slate-500">{subscription?.subscription ? `Active until ${new Date(subscription.subscription.endsAt).toLocaleDateString('en-IN')}` : 'Subscription enforcement is controlled by the company during rollout.'}</p></div><div className="text-right"><p className="text-xs text-slate-500">Commission payable</p><strong className="text-lg text-slate-950">₹{Number(subscription?.dueCommission || 0).toFixed(2)}</strong></div></div>
      </section>}
      {profile && <WorkerPayments profile={profile} earnings={earnings} refresh={fetchProfile} />}
      {/* Earnings Overview Cards */}
      {earnings && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-3xl space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500">{t.todayEarnings}</span>
            <p className="text-2xl font-black text-brand-600">₹{earnings.todayEarnings}</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-3xl space-y-1 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500">{t.weekEarnings}</span>
            <p className="text-2xl font-black text-slate-900">₹{earnings.weekEarnings}</p>
          </div>
        </div>
      )}

      {/* Active Booking Card */}
      {activeBooking ? (
        <div className="bg-white border-2 border-brand-500 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-brand-50 border border-brand-200 text-brand-800 text-xs font-black rounded-full uppercase tracking-wider">
              {activeBooking.status}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              #{activeBooking.id.slice(0, 8)}
            </span>
          </div>

          <div>
            <h2 className="text-base font-black text-slate-900">{activeBooking.service?.nameEn}</h2>
            <p className="text-xs text-slate-600 mt-1 flex items-start gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
              <span>{activeBooking.pickupAddress}</span>
            </p>
          </div>

          {/* Action Buttons based on Status */}
          <div className="space-y-2 pt-2">
            {activeBooking.status === 'ASSIGNED' && (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeBooking.pickupLat},${activeBooking.pickupLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{t.navigate}</span>
                </a>

                <button
                  onClick={() => handleUpdateStatus('EN_ROUTE')}
                  className="py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-2xl shadow-sm"
                >
                  Start Trip
                </button>
              </div>
            )}

            {activeBooking.status === 'EN_ROUTE' && (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeBooking.pickupLat},${activeBooking.pickupLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{t.navigate}</span>
                </a>

                <button
                  onClick={() => handleUpdateStatus('ARRIVED')}
                  className="py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-2xl shadow-sm"
                >
                  I Have Arrived
                </button>
              </div>
            )}

            {activeBooking.status === 'ARRIVED' && (
              <button
                onClick={() => setShowOtpModal(true)}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{t.verifyStartOtp}</span>
              </button>
            )}

            {activeBooking.items?.length > 0 && <div className="space-y-2">{activeBooking.items.map((item:any)=><p key={item.id} className="text-sm p-2 bg-slate-50 rounded-lg">{item.description} · ₹{item.unitPrice * item.quantity} · {item.approvalStatus}</p>)}</div>}
            {activeBooking.status === 'IN_PROGRESS' && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-brand-600" />
                  <span>{t.addExtraItem}</span>
                </button>

                <button
                  onClick={handleCompleteBooking}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t.markComplete}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white border border-dashed border-slate-300 rounded-3xl text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            {profile?.kycStatus !== 'APPROVED' ? 'Jobs become available after your KYC is approved.' : isOnline ? 'You’re online. Nearby requests will appear here when available.' : 'You’re offline. Go online when you’re ready to accept jobs.'}
          </p>
        </div>
      )}

      {/* 30-Second Incoming Job Popup Modal */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
            {/* Circular Countdown */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-black rounded-full uppercase tracking-wider animate-pulse">
                {t.incomingRequest}
              </span>
              <div className="w-10 h-10 rounded-full border-4 border-brand-500 flex items-center justify-center font-black text-sm text-brand-900">
                {countdown}s
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">{incomingRequest.serviceName}</h2>
              <p className="text-xs text-slate-600 mt-1 flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                <span>{incomingRequest.pickupAddress}</span>
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-around text-center text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Distance</span>
                <span className="font-black text-slate-900 text-sm">
                  {incomingRequest.roadDistanceKm || (incomingRequest.distanceMeters / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="border-x border-slate-200 px-3">
                <span className="text-slate-500 font-semibold block">ETA</span>
                <span className="font-black text-slate-900 text-sm">~{incomingRequest.etaMinutes} min</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Visit Fee</span>
                <span className="font-black text-brand-700 text-sm">₹{incomingRequest.baseVisitCharge}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleRejectJob}
                className="py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-sm rounded-2xl transition"
              >
                {t.decline}
              </button>
              <button
                onClick={handleAcceptJob}
                className="py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm rounded-2xl shadow-lg transition"
              >
                {t.accept}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-gray-900">{t.verifyStartOtp}</h3>
              <button onClick={() => setShowOtpModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <p className="text-xs text-gray-600">
              Ask customer for their 4-digit code shown on their tracking screen.
            </p>

            <input
              type="text"
              maxLength={4}
              value={startOtp}
              onChange={(e) => setStartOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              className="w-full text-center text-3xl font-mono font-black tracking-widest py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <button
              onClick={handleStartBooking}
              disabled={startOtp.length !== 4}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow"
            >
              Verify & Start Work
            </button>
          </div>
        </div>
      )}

      {/* Add Extra Work / Part Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-gray-900">{t.addExtraItem}</h3>
              <button onClick={() => setShowAddItemModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="e.g. Fan Capacitor Replacement"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="150"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPart"
                  checked={isPart}
                  onChange={(e) => setIsPart(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <label htmlFor="isPart" className="text-xs font-bold text-gray-700">
                  This is a material / part (not labor)
                </label>
              </div>
            </div>

            <button
              onClick={handleAddItem}
              disabled={!itemDesc || !itemPrice}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow"
            >
              Send to Customer for Approval
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
