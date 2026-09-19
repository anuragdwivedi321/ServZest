'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useSocket } from '../../../context/SocketContext';
import { api } from '../../../lib/api';
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
  const { user, refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const { socket } = useSocket();

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

  const fetchProfile = async () => {
    try {
      const res = await api.getWorkerProfile();
      if (res.success) {
        setProfile(res.profile);
        setIsOnline(res.profile.isOnline);
        setActiveBooking(res.activeBooking);
      }
      const earnRes = await api.getWorkerEarnings();
      if (earnRes.success) {
        setEarnings(earnRes);
      }
    } catch (e) {
      console.error('Error fetching worker profile', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [user]);

  // Socket & Periodic GPS Location Updates
  useEffect(() => {
    if (!socket || !profile) return;

    socket.emit('join_worker', { workerId: profile.id });

    // Listen for new 30-sec incoming requests
    socket.on('worker:new_request', (data: any) => {
      console.log('Incoming job request:', data);
      setIncomingRequest(data);
      setCountdown(data.timeoutSec || 30);
    });

    // Periodic GPS simulation/update every 8 seconds
    const gpsInterval = setInterval(() => {
      if (isOnline) {
        // Use browser geolocation if available, otherwise default coordinates with small jitter
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              socket.emit('worker:location_update', {
                workerId: profile.id,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            () => {
              // Fallback jitter around New Delhi
              socket.emit('worker:location_update', {
                workerId: profile.id,
                lat: 28.6139 + (Math.random() - 0.5) * 0.005,
                lng: 77.2090 + (Math.random() - 0.5) * 0.005,
              });
            }
          );
        }
      }
    }, 8000);

    return () => {
      socket.off('worker:new_request');
      clearInterval(gpsInterval);
    };
  }, [socket, profile, isOnline]);

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
    try {
      const nextState = !isOnline;
      const res = await api.toggleWorkerOnline(nextState);
      if (res.success) {
        setIsOnline(res.isOnline);
      } else {
        alert(res.message || 'Could not change status');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to toggle online status');
    }
  };

  const handleAcceptJob = async () => {
    if (!incomingRequest) return;
    try {
      const res = await api.acceptBooking(incomingRequest.bookingId);
      if (res.success) {
        setIncomingRequest(null);
        fetchProfile();
      } else {
        alert(res.message);
        setIncomingRequest(null);
      }
    } catch (e: any) {
      alert(e.message || 'Accept failed');
    }
  };

  const handleRejectJob = async () => {
    if (!incomingRequest) return;
    try {
      await api.rejectBooking(incomingRequest.bookingId);
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
      }
    } catch (e: any) {
      alert(e.message);
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
        alert(res.message || 'Invalid start OTP');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to start booking');
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
        alert('Item sent to customer for approval!');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to add item');
    }
  };

  const handleCompleteBooking = async () => {
    if (!activeBooking) return;
    if (!confirm('Are you sure you want to finish and complete this job?')) return;
    try {
      const res = await api.completeBooking(activeBooking.id);
      if (res.success) {
        alert(`Job completed! Final bill: ₹${res.bill.totalAmount}. Your net earning: ₹${res.bill.workerEarnings}`);
        fetchProfile();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to complete job');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading Worker Console...</div>;
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Worker Header & Online Toggle */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {profile?.user?.name || 'Worker Console'}
            </h1>
            <p className="text-xs text-gray-500 font-semibold">
              Rating: ★ {profile?.rating} ({profile?.totalRatings} reviews)
            </p>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-black text-xs transition shadow-md ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? t.goOffline : t.goOnline}</span>
          </button>
        </div>

        {profile?.kycStatus !== 'APPROVED' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
            <span>KYC Status: <b>{profile?.kycStatus}</b></span>
            <Link href="/worker/kyc" className="font-bold underline text-brand-700">
              Submit KYC &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Earnings Overview Cards */}
      {earnings && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-1">
            <span className="text-[11px] font-bold text-emerald-800">{t.todayEarnings}</span>
            <p className="text-2xl font-black text-emerald-900">₹{earnings.todayEarnings}</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-3xl space-y-1">
            <span className="text-[11px] font-bold text-blue-800">{t.weekEarnings}</span>
            <p className="text-2xl font-black text-blue-900">₹{earnings.weekEarnings}</p>
          </div>
        </div>
      )}

      {/* Active Booking Card */}
      {activeBooking ? (
        <div className="bg-white border-2 border-brand-500 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full uppercase tracking-wider">
              {activeBooking.status}
            </span>
            <span className="text-xs font-mono font-bold text-gray-400">
              #{activeBooking.id.slice(0, 8)}
            </span>
          </div>

          <div>
            <h2 className="text-base font-black text-gray-900">{activeBooking.service?.nameEn}</h2>
            <p className="text-xs text-gray-600 mt-1 flex items-start gap-1 font-medium">
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
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{t.navigate}</span>
                </a>

                <button
                  onClick={() => handleUpdateStatus('EN_ROUTE')}
                  className="py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-2xl shadow"
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
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{t.navigate}</span>
                </a>

                <button
                  onClick={() => handleUpdateStatus('ARRIVED')}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow"
                >
                  I Have Arrived
                </button>
              </div>
            )}

            {activeBooking.status === 'ARRIVED' && (
              <button
                onClick={() => setShowOtpModal(true)}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{t.verifyStartOtp}</span>
              </button>
            )}

            {activeBooking.status === 'IN_PROGRESS' && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="w-full py-3 bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-brand-600" />
                  <span>{t.addExtraItem}</span>
                </button>

                <button
                  onClick={handleCompleteBooking}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t.markComplete}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-3xl text-center space-y-2">
          <Clock className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-bold text-gray-700">
            {isOnline ? 'Waiting for incoming customer requests...' : 'You are currently offline. Turn online to get jobs.'}
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
              <div className="w-10 h-10 rounded-full border-4 border-amber-500 flex items-center justify-center font-black text-sm text-amber-900">
                {countdown}s
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-gray-900">{incomingRequest.serviceName}</h2>
              <p className="text-xs text-gray-600 mt-1 flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                <span>{incomingRequest.pickupAddress}</span>
              </p>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex items-center justify-around text-center text-xs">
              <div>
                <span className="text-gray-500 font-semibold block">Distance</span>
                <span className="font-black text-gray-900 text-sm">
                  {incomingRequest.roadDistanceKm || (incomingRequest.distanceMeters / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="border-x border-amber-200 px-3">
                <span className="text-gray-500 font-semibold block">ETA</span>
                <span className="font-black text-gray-900 text-sm">~{incomingRequest.etaMinutes} min</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block">Visit Fee</span>
                <span className="font-black text-emerald-700 text-sm">₹{incomingRequest.baseVisitCharge}</span>
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
                className="py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-sm rounded-2xl shadow-lg transition"
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
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow"
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
