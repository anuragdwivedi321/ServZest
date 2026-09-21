'use client';

import { PaymentPanel, BookingComplaint } from '../../../components/booking/PaymentPanel';
import { Modal } from '../../../components/common/Modal';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { api } from '../../../lib/api';
import { useFeedback } from '../../../context/FeedbackContext';
import { LeafletMap } from '../../../components/map/LeafletMapDynamic';
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
  PhoneCall,
  AlertOctagon,
  FileText,
  Printer,
  Share2,
  X,
  HelpCircle,
} from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();
  const { notify } = useFeedback();

  const [booking, setBooking] = useState<any>(null);
  const [bill, setBill] = useState<any>(null);
  const [workerPos, setWorkerPos] = useState<[number, number] | undefined>(undefined);
  const [tracking, setTracking] = useState<any>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modals
  const [showSosModal, setShowSosModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Cancel reason state
  const cancelReasons = [
    'Changed my mind',
    'Found another provider',
    'Worker delayed / ETA too long',
    'Booked by mistake',
    'Other',
  ];
  const [selectedReason, setSelectedReason] = useState(cancelReasons[0]);
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Rating state
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];
  const complimentTags = ['Punctual', 'Expert Work', 'Polite', 'Fair Pricing', 'Clean Work'];

  // Extra items modal
  const [pendingItem, setPendingItem] = useState<any>(null);

  const fetchBooking = async () => {
    try {
      const res = await api.getBooking(id);
      if (res.success) {
        setLoadError('');
        setBooking(res.booking);
        setBill(res.bill);
        setTracking(res.workerLocation);
        setWorkerPos(res.workerLocation ? [res.workerLocation.lat, res.workerLocation.lng] : undefined);
        setEtaMinutes(res.workerLocation?.etaMinutes ?? null);
        if (res.booking.rating) setRated(true);

        // Check if any pending items
        const pending = res.booking.items?.find((i: any) => i.approvalStatus === 'PENDING');
        setPendingItem(pending || null);
      } else { setLoadError(res.message || 'Booking unavailable.'); }
    } catch (e) {
      setLoadError('Could not load booking. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchBooking();
    const interval = setInterval(fetchBooking, 4000);
    return () => clearInterval(interval);
  }, [id, authLoading, user?.id]);

  // Socket.io Real-time Listeners
  useEffect(() => {
    if (!socket) return;

    const join = () => socket.emit('join_booking', { bookingId: id });
    join();
    socket.on('connect', join);

    socket.on('booking:status_update', (data: any) => {
      console.log('Received booking:status_update', data);
      fetchBooking();
    });

    socket.on('booking:worker_location', (data: any) => {
      if (data.bookingId !== id) return;
      setWorkerPos([data.lat, data.lng]);
      // Road distance and ETA refresh from the authenticated booking API.
      setTracking((previous: any) => previous ? { ...previous, updatedAt: data.updatedAt } : previous);
    });

    socket.on('booking:extra_item_added', (data: any) => {
      if (data.bookingId === id) setPendingItem(data.item);
    });

    return () => {
      socket.off('connect', join);
      socket.emit('leave_booking', { bookingId: id });
      socket.off('booking:status_update');
      socket.off('booking:worker_location');
      socket.off('booking:extra_item_added');
    };
  }, [socket, id]);

  const handleConfirmCancel = async () => {
    const finalReason = selectedReason === 'Other' && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    setCancelling(true);
    try {
      const res = await api.cancelBooking(id, finalReason);
      if (res.success) {
        setShowCancelModal(false);
        fetchBooking();
      } else {
        notify(res.message || 'Failed to cancel booking', 'danger');
      }
    } catch (e: any) {
      notify(e.message || 'Failed to cancel', 'danger');
    } finally {
      setCancelling(false);
    }
  };

  const handleApproveItem = async (action: 'APPROVE' | 'REJECT') => {
    if (!pendingItem) return;
    try {
      const result = await api.approveItem(id, pendingItem.id, action);
      if (!result.success) throw new Error(result.message);
      setPendingItem(null);
      fetchBooking();
    } catch (e: any) {
      notify(e.message || 'Could not update this item.', 'danger');
    }
  };


  const handleRate = async () => {
    setRatingSubmitting(true);
    try {
      const res = await api.rateBooking(id, stars, comment);
      if (res.success) {
        setRated(true);
      } else { notify(res.message || 'Could not save review.', 'danger'); }
    } catch (e: any) {
      notify(e.message || 'Rating failed', 'danger');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleShareTrip = async () => {
    try {
      await navigator.clipboard.writeText(`ServZest service location: https://www.google.com/maps/search/?api=1&query=${booking.pickupLat},${booking.pickupLng}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch { notify('Could not copy the location. Allow clipboard access or share your address directly.', 'danger'); }
  };

  if (loadError) return <div className="p-8 bg-white border rounded-2xl space-y-4"><p role="alert">{loadError}</p><button onClick={fetchBooking} className="font-bold text-brand-700">Retry</button></div>;

  if (loading || !booking) {
    return (
      <div className="space-y-4 pt-6">
        <div className="h-8 bg-gray-200 animate-pulse rounded-xl w-2/3" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const status = booking.status;
  const isActive = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(status);
  const canCancel = ['SCHEDULED', 'NO_PROVIDER', 'SEARCHING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(status);

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Status Header, Map, OTP, Worker Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Header with Status & Emergency SOS Button */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">
            Booking #{id.slice(0, 8)}
          </span>

          <div className="flex items-center gap-2">
            {/* Emergency SOS Button (visible on active bookings) */}
            {isActive && (
              <button
                type="button"
                onClick={() => setShowSosModal(true)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm transition animate-pulse"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>SOS</span>
              </button>
            )}

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
        </div>

        {booking.scheduledAt && <p className="text-sm font-bold text-brand-700">Visit window starts: {new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</p>}
        {status === 'SCHEDULED' && <p className="text-xs text-slate-500">Matching starts at your selected time. No payment has been collected.</p>}
        {status === 'NO_PROVIDER' && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm space-y-2"><p>No nearby professional accepted this request. Nothing has been charged. Try another time or schedule a visit.</p><button onClick={() => router.push(`/book/${booking.service.slug}`)} className="text-brand-700 font-bold underline">Book another time</button></div>}
        {booking.problemDescription && <p className="text-sm text-slate-600">Your request: {booking.problemDescription}</p>}
        {/* Status Message */}
        <div>
          <h1 className="text-lg font-black text-gray-900 leading-tight">
            {status === 'SCHEDULED' && 'Your visit is scheduled'}
            {status === 'NO_PROVIDER' && 'No professional available right now'}
            {status === 'SEARCHING' && t.searchingWorker}
            {status === 'ASSIGNED' && t.workerAssigned}
            {status === 'EN_ROUTE' && t.enRoute}
            {status === 'ARRIVED' && t.arrived}
            {status === 'IN_PROGRESS' && t.inProgress}
            {status === 'COMPLETED' && t.completed}
            {status === 'CANCELLED' && t.cancelled}
          </h1>

          {tracking?.route && etaMinutes && (status === 'ASSIGNED' || status === 'EN_ROUTE') && (
            <p className="text-xs font-bold text-brand-600 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Arriving in ~{etaMinutes} minutes</span>
            </p>
          )}

          {booking.pickupAddress && (
            <p className="text-xs text-slate-500 mt-1 truncate">
              📍 {booking.pickupAddress}
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
          routePoints={tracking?.route?.points}
          className="h-64 w-full rounded-3xl overflow-hidden border border-gray-200 shadow-sm"
        />
      )}

      {['ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(status) && <section aria-label="Live professional tracking" className="bg-white border rounded-2xl p-4 space-y-2">
        <h2 className="font-bold">Professional → Your service location</h2>
        {tracking ? <>
          <p className="text-xl font-bold text-brand-700">{tracking.route ? (tracking.route.distanceMeters < 1000 ? Math.round(tracking.route.distanceMeters) + ' m' : (tracking.route.distanceMeters / 1000).toFixed(1) + ' km') + ' by road' : 'Road distance temporarily unavailable'}{tracking.route && status !== 'ARRIVED' ? ' · ~' + Math.max(1, Math.ceil(tracking.route.durationSeconds / 60)) + ' min' : ''}</p>
          <p className="text-xs text-slate-500">Red home pin: your address · Green tool pin: professional. Location updated {new Date(tracking.updatedAt).toLocaleTimeString()}.</p>
          <p className="text-xs text-slate-500">{tracking.route ? 'Route: OSRM / OpenStreetMap. Estimated driving time; live traffic is not included.' : 'Latest GPS marker is shown. The road route will retry automatically.'}</p>
        </> : <p className="text-sm text-amber-800">Waiting for a fresh professional location. They need to keep their dashboard open and allow GPS.</p>}
      </section>}

      {/* 4-Digit Start OTP Card (Prominently shown once worker is assigned) */}
      {(status === 'ASSIGNED' || status === 'EN_ROUTE' || status === 'ARRIVED') && (
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-3xl p-5 shadow-md space-y-2">
          <p className="text-xs font-bold text-brand-100 tracking-wide uppercase">{t.startOtp}</p>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-black tracking-widest font-mono bg-black/20 px-4 py-2 rounded-2xl">
              {booking.startOtp}
            </div>
            <p className="text-xs text-brand-100 max-w-[140px] leading-tight">
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
              <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-2xl font-black text-brand-800">
                👷
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-gray-900">
                    {booking.worker.user?.name || 'Assigned professional'}
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
              className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
          </div>

          {booking.worker.vehicleType && (
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl">
              Vehicle: <span className="font-bold text-gray-800">{booking.worker.vehicleType}</span>
            </p>
          )}
        </div>
      )}
        </div>

        {/* Right Column (Sticky on Desktop): Extra Items, Bill, Rating, Cancel */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
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
      {bill && status !== 'CANCELLED' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900">{status === 'COMPLETED' ? t.finalBill : 'Booking estimate'}</h3>

            {/* View Tax Invoice Button */}
            {status === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.viewInvoice || 'View Invoice'}</span>
              </button>
            )}
          </div>

          {booking.items?.filter((item: any) => item.approvalStatus === 'APPROVED').map((item: any) => <div key={item.id} className="flex justify-between text-slate-600"><span>{item.description} × {item.quantity}</span><span>₹{item.unitPrice * item.quantity}</span></div>)}
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
              <div className="flex justify-between text-slate-600 pt-2">
                <span>{t.nightSurge}</span>
                <span className="font-bold">+₹{bill.nightSurgeAmount}</span>
              </div>
            )}

            {bill.rushSurgeAmount > 0 && (
              <div className="flex justify-between text-slate-600 pt-2">
                <span>{t.rushSurge}</span>
                <span className="font-bold">+₹{bill.rushSurgeAmount}</span>
              </div>
            )}

            {bill.discountAmount > 0 && <div className="flex justify-between text-emerald-700 pt-2"><span>Coupon ({booking.couponCode})</span><b>−₹{bill.discountAmount}</b></div>}
            <div className="flex justify-between items-center pt-3 font-black text-base text-slate-900">
              <span>{t.totalAmount}</span>
              <span className="text-xl text-brand-600">₹{bill.totalAmount}</span>
            </div>
          </div>

          {status === 'COMPLETED' && <PaymentPanel booking={booking} refresh={fetchBooking} />}
        </div>
      )}

      <BookingComplaint id={id} />

      {/* Rating & Review Section (After completion) */}
      {status === 'COMPLETED' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900">{t.rateWorker}</h3>
            {rated && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reviewed</span>
              </span>
            )}
          </div>

          {rated ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <div className="flex justify-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= (booking.rating?.stars || stars) ? 'fill-amber-500' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {booking.rating?.comment || comment || 'Thank you for your rating!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Interactive Stars */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const active = (hoverStars || stars) >= num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setStars(num)}
                        onMouseEnter={() => setHoverStars(num)}
                        onMouseLeave={() => setHoverStars(0)}
                        className="focus:outline-none transition transform hover:scale-125"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            active ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-amber-700 mt-1">
                  {starLabels[hoverStars || stars]}
                </span>
              </div>

              {/* Quick Compliment Tags */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {complimentTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setComment((prev) => (prev ? `${prev}, ${tag}` : tag))
                    }
                    className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded-full text-slate-700 border border-slate-200 transition"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share more details about your experience..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={2}
              />

              <button
                onClick={handleRate}
                disabled={ratingSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition shadow-sm"
              >
                {ratingSubmitting ? 'Submitting...' : t.submitReview}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Booking Button */}
      {canCancel && (
        <button
          onClick={() => setShowCancelModal(true)}
          className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1.5"
        >
          <XCircle className="w-4 h-4" />
          <span>{t.cancelBooking}</span>
        </button>
      )}
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. EMERGENCY SOS MODAL */}
      {showSosModal && (
        <Modal label="Emergency assistance" busy={false} onClose={() => setShowSosModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <AlertOctagon className="w-6 h-6 fill-red-100" />
                <h3 className="text-base font-black uppercase tracking-wide">
                  {t.emergencySos || 'Emergency Safety Assistance'}
                </h3>
              </div>
              <button
                onClick={() => setShowSosModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              For an emergency, contact national emergency services. For booking problems, send a support request.
            </p>

            <div className="space-y-2.5">
              <a
                href="/contact"
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Contact ServZest support</span>
              </a>

              <a
                href="tel:112"
                className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Police & Emergency: 112</span>
              </a>

              <button
                type="button"
                onClick={handleShareTrip}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
              >
                <Share2 className="w-4 h-4 text-brand-600" />
                <span>{copiedLink ? 'Location copied!' : 'Copy service location for family'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSosModal(false)}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 pt-1"
            >
              I am safe, close this
            </button>
          </div>
        </Modal>
      )}

      {/* 2. CANCEL BOOKING MODAL */}
      {showCancelModal && (
        <Modal label="Confirm cancellation" busy={cancelling} onClose={() => setShowCancelModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-black">
                  {t.confirmCancel || 'Cancel Booking?'}
                </h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-tight">
              <span className="font-bold">Cancellation Policy: </span>
              Free cancellation within 2 minutes of worker assignment. A nominal ₹40 fee applies if cancelled after the worker has arrived.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-2">
                {t.cancelReason || 'Please select a reason:'}
              </label>
              <div className="space-y-1.5">
                {cancelReasons.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReason === reason
                        ? 'bg-brand-50 border-brand-600 text-brand-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Specify reason..."
                  className="w-full mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                {t.keepBooking || 'Keep Booking'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm"
              >
                {cancelling ? 'Cancelling...' : t.confirmCancel || 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. TAX INVOICE MODAL */}
      {showInvoiceModal && (
        <Modal label="Booking invoice" busy={false} onClose={() => setShowInvoiceModal(false)}>
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200 print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">ServZest</h3>
                <p className="text-[11px] text-slate-500 font-semibold">{t.invoice || 'Tax Invoice & Receipt'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice To:</span>
                <p className="font-bold text-slate-900">{booking.customer?.name || user?.phone || 'Customer'}</p>
                <p className="text-[11px] text-slate-500">{booking.customer?.phone || user?.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Details:</span>
                <p className="font-mono font-bold text-slate-900">#{id.slice(0, 8)}</p>
                <p className="text-[11px] text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Service & Worker */}
            <div className="text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Service:</span>
                <span>{booking.service?.nameEn}</span>
              </div>
              {booking.worker && (
                <div className="flex justify-between text-slate-600">
                  <span>Service Partner:</span>
                  <span>{booking.worker.user?.name || 'Assigned professional'}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Location:</span>
                <span className="max-w-[200px] truncate text-right">{booking.pickupAddress}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-700 flex justify-between">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-slate-100 p-2.5 space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Base Visit / Diagnostic Fee</span>
                  <span className="font-semibold">₹{bill?.baseVisitCharge || booking.baseVisitCharge}</span>
                </div>

                {bill?.serviceTotal > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Extra Labor / Services</span>
                    <span className="font-semibold">₹{bill.serviceTotal}</span>
                  </div>
                )}

                {bill?.partsTotal > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Parts & Materials</span>
                    <span className="font-semibold">₹{bill.partsTotal}</span>
                  </div>
                )}

                {bill?.nightSurgeAmount > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Night Surge</span>
                    <span className="font-semibold">+₹{bill.nightSurgeAmount}</span>
                  </div>
                )}

                {bill?.rushSurgeAmount > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Rush Surge</span>
                    <span className="font-semibold">+₹{bill.rushSurgeAmount}</span>
                  </div>
                )}

                {bill?.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon discount</span><span>−₹{bill.discountAmount}</span></div>}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-brand-700">₹{bill?.totalAmount || booking.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Payment Badge */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span>Payment Status:</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{booking.payment?.status === 'COMPLETED' ? `Paid via ${booking.payment.method}` : 'Payment pending'}</span>
              </span>
            </div>

            {/* Footer Notice */}
            <p className="text-[10px] text-center text-slate-400">
              ServZest · Support requests: /contact
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
