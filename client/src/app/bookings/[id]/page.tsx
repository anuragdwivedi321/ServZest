'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { api } from '../../../lib/api';
import { LeafletMap } from '../../../components/map/LeafletMap';
import {
  Clock,
  ShieldCheck,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  RotateCcw,
} from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [booking, setBooking] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [workerPos, setWorkerPos] = useState<[number, number] | undefined>(undefined);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Rating state
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState(false);

  // Extra items modal
  const [pendingItem, setPendingItem] = useState<any>(null);

  const fetchBooking = async () => {
    try {
      const res = await api.getBooking(id);
      if (res.success) {
        setBooking(res.booking);
        setBill(res.bill);
        if (res.booking.rating) setRated(true);

        // Check if any pending items
        const pending = res.booking.items?.find((i: any) => i.approvalStatus === 'PENDING');
        if (pending) setPendingItem(pending);
      }
    } catch (e) {
      console.error('Error fetching booking', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, 4000);
    return () => clearInterval(interval);
  }, [id]);

  // Socket.io Real-time Listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_booking', { bookingId: id });

    socket.on('booking:status_update', (data: any) => {
      console.log('Received booking:status_update', data);
      fetchBooking();
    });

    socket.on('booking:worker_location', (data: any) => {
      setWorkerPos([data.lat, data.lng]);
      if (data.etaMinutes) setEtaMinutes(data.etaMinutes);
    });

    socket.on('booking:extra_item_added', (data: any) => {
      setPendingItem(data.item);
    });

    return () => {
      socket.off('booking:status_update');
      socket.off('booking:worker_location');
      socket.off('booking:extra_item_added');
    };
  }, [socket, id]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await api.cancelBooking(id, 'Customer cancelled from app');
      if (res.success) {
        alert(res.message);
        fetchBooking();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to cancel');
    }
  };

  const handleApproveItem = async (action: 'APPROVE' | 'REJECT') => {
    if (!pendingItem) return;
    try {
      await api.approveItem(id, pendingItem.id, action);
      setPendingItem(null);
      fetchBooking();
    } catch (e) {
      console.error('Error handling item approval', e);
    }
  };

  const handlePay = async (method: 'CASH' | 'UPI') => {
    try {
      const res = await api.payBill(id, method);
      if (res.success) {
        alert(`Payment of ₹${res.payment.amount} successful via ${method}`);
        fetchBooking();
      }
    } catch (e: any) {
      alert(e.message || 'Payment failed');
    }
  };

  const handleRate = async () => {
    try {
      const res = await api.rateBooking(id, stars, comment);
      if (res.success) {
        setRated(true);
        alert('Thank you for rating your worker!');
      }
    } catch (e: any) {
      alert(e.message || 'Rating failed');
    }
  };

  if (loading || !booking) {
    return (
      <div className="space-y-4 pt-6">
        <div className="h-8 bg-gray-200 animate-pulse rounded-xl w-2/3" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const status = booking.status;

  return (
    <div className="space-y-5 pb-8">
      {/* Status Header */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">
            Booking #{id.slice(0, 8)}
          </span>
          <span
            className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
              status === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-800'
                : status === 'CANCELLED'
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800 animate-pulse'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Status Message */}
        <div>
          <h1 className="text-lg font-black text-gray-900 leading-tight">
            {status === 'SEARCHING' && t.searchingWorker}
            {status === 'ASSIGNED' && t.workerAssigned}
            {status === 'EN_ROUTE' && t.enRoute}
            {status === 'ARRIVED' && t.arrived}
            {status === 'IN_PROGRESS' && t.inProgress}
            {status === 'COMPLETED' && t.completed}
            {status === 'CANCELLED' && t.cancelled}
          </h1>

          {etaMinutes && (status === 'ASSIGNED' || status === 'EN_ROUTE') && (
            <p className="text-xs font-bold text-brand-600 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Arriving in ~{etaMinutes} minutes</span>
            </p>
          )}
        </div>
      </div>

      {/* Live Map (When searching, assigned, en route, or arrived) */}
      {status !== 'COMPLETED' && status !== 'CANCELLED' && (
        <LeafletMap
          center={[booking.pickupLat, booking.pickupLng]}
          customerLocation={[booking.pickupLat, booking.pickupLng]}
          workerLocation={workerPos}
          className="h-64 w-full rounded-3xl overflow-hidden border border-gray-200 shadow-sm"
        />
      )}

      {/* 4-Digit Start OTP Card (Prominently shown once worker is assigned) */}
      {(status === 'ASSIGNED' || status === 'EN_ROUTE' || status === 'ARRIVED') && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg space-y-2">
          <p className="text-xs font-bold text-amber-100 tracking-wide uppercase">{t.startOtp}</p>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-black tracking-widest font-mono bg-black/20 px-4 py-2 rounded-2xl">
              {booking.startOtp}
            </div>
            <p className="text-xs text-amber-100 max-w-[140px] leading-tight">
              {language === 'hi'
                ? 'कारीगर के आने पर यह 4-अंकों का कोड बताएं।'
                : 'Share with worker upon arrival to start work.'}
            </p>
          </div>
        </div>
      )}

      {/* Worker Details Card */}
      {booking.worker && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl font-black text-amber-800">
                👷
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-gray-900">
                    {booking.worker.user?.name || 'Verified Worker'}
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{booking.worker.rating} ({booking.worker.totalRatings} jobs)</span>
                </div>
              </div>
            </div>

            <a
              href={`tel:${booking.worker.user?.phone}`}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-full hover:bg-black transition"
            >
              Call
            </a>
          </div>

          {booking.worker.vehicleType && (
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl">
              Vehicle: <span className="font-bold text-gray-800">{booking.worker.vehicleType}</span>
            </p>
          )}
        </div>
      )}

      {/* Extra Items Approval Modal / Card */}
      {pendingItem && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-5 shadow-md space-y-3 animate-bounce">
          <div className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-black uppercase tracking-wide">{t.extraWorkTitle}</h3>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-orange-200 text-xs space-y-1">
            <p className="font-bold text-gray-900">{pendingItem.description}</p>
            <p className="text-gray-600">
              Type: <span className="font-semibold">{pendingItem.isPart ? 'Part/Material' : 'Extra Labor'}</span>
            </p>
            <p className="text-base font-black text-brand-600">
              ₹{pendingItem.unitPrice} &times; {pendingItem.quantity} = ₹
              {pendingItem.unitPrice * pendingItem.quantity}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleApproveItem('APPROVE')}
              className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
            >
              {t.approve}
            </button>
            <button
              onClick={() => handleApproveItem('REJECT')}
              className="py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition"
            >
              {t.reject}
            </button>
          </div>
        </div>
      )}

      {/* Final Bill Breakdown & Payment (When Completed or In Progress) */}
      {bill && (status === 'IN_PROGRESS' || status === 'COMPLETED') && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3 text-xs">
          <h3 className="text-sm font-black text-gray-900">{t.finalBill}</h3>

          <div className="space-y-2 divide-y divide-gray-100">
            <div className="flex justify-between text-gray-600 pt-1">
              <span>{t.visitCharge}</span>
              <span className="font-bold text-gray-900">₹{bill.baseVisitCharge}</span>
            </div>

            {bill.serviceTotal > 0 && (
              <div className="flex justify-between text-gray-600 pt-2">
                <span>{t.serviceTotal}</span>
                <span className="font-bold text-gray-900">₹{bill.serviceTotal}</span>
              </div>
            )}

            {bill.partsTotal > 0 && (
              <div className="flex justify-between text-gray-600 pt-2">
                <span>{t.partsTotal}</span>
                <span className="font-bold text-gray-900">₹{bill.partsTotal}</span>
              </div>
            )}

            {bill.nightSurgeAmount > 0 && (
              <div className="flex justify-between text-amber-700 pt-2">
                <span>{t.nightSurge}</span>
                <span className="font-bold">+₹{bill.nightSurgeAmount}</span>
              </div>
            )}

            {bill.rushSurgeAmount > 0 && (
              <div className="flex justify-between text-amber-700 pt-2">
                <span>{t.rushSurge}</span>
                <span className="font-bold">+₹{bill.rushSurgeAmount}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 font-black text-base text-gray-900">
              <span>{t.totalAmount}</span>
              <span className="text-xl text-brand-600">₹{bill.totalAmount}</span>
            </div>
          </div>

          {/* Payment Status / Action */}
          {status === 'COMPLETED' && (
            <div className="pt-2">
              {booking.payment?.status === 'COMPLETED' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Paid ₹{booking.payment.amount} via {booking.payment.method}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePay('CASH')}
                    className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>{t.payCash}</span>
                  </button>
                  <button
                    onClick={() => handlePay('UPI')}
                    className="py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{t.payUpi}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rating & Review Section (After completion) */}
      {status === 'COMPLETED' && !rated && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-gray-900">{t.rateWorker}</h3>
          <div className="flex items-center gap-2 justify-center py-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button key={num} onClick={() => setStars(num)} className="focus:outline-none">
                <Star
                  className={`w-8 h-8 ${
                    num <= stars ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                  } transition hover:scale-110`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a feedback for worker..."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={2}
          />

          <button
            onClick={handleRate}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl transition"
          >
            {t.submitReview}
          </button>
        </div>
      )}

      {/* Cancel Booking Button */}
      {status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'IN_PROGRESS' && (
        <button
          onClick={handleCancel}
          className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5"
        >
          <XCircle className="w-4 h-4" />
          <span>{t.cancelBooking}</span>
        </button>
      )}
    </div>
  );
}
