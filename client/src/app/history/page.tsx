'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import {
  History,
  Calendar,
  MapPin,
  ArrowRight,
  User,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  X,
  CreditCard,
  Banknote,
  ShieldCheck,
} from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<any | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?next=/history');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      router.replace(user.role === 'WORKER' ? '/worker/dashboard' : '/admin');
      return;
    }
    api.getMyBookings().then((res) => {
      if (res.success) setBookings(res.bookings);
      setLoading(false);
    });
  }, [user, authLoading, router]);

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <div className="h-8 bg-gray-200 animate-pulse rounded-xl w-1/3" />
        <div className="h-32 bg-gray-200 animate-pulse rounded-2xl" />
        <div className="h-32 bg-gray-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    if (filter === 'CANCELLED') return b.status === 'CANCELLED';
    if (filter === 'ACTIVE') return !['COMPLETED', 'CANCELLED', 'NO_PROVIDER'].includes(b.status);
    return true;
  });

  return (
    <div className="space-y-5 pb-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-brand-600" />
          <h1 className="text-xl font-black text-gray-900 tracking-tight">{t.history}</h1>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {(['ALL', 'COMPLETED', 'ACTIVE', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              filter === tab
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {tab === 'ALL' && 'All'}
            {tab === 'COMPLETED' && 'Completed'}
            {tab === 'ACTIVE' && 'Active'}
            {tab === 'CANCELLED' && 'Cancelled'}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="p-8 bg-white border border-gray-200 rounded-3xl text-center space-y-3 shadow-sm">
          <p className="text-xs font-bold text-gray-500">No bookings found in this category.</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            {t.bookNow}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const isCompleted = b.status === 'COMPLETED';
            const isCancelled = b.status === 'CANCELLED';
            const workerName = b.worker?.user?.name || (b.status === 'SEARCHING' ? 'Searching for partner...' : 'Assigned Partner');
            const displayAmount = b.payment?.amount || b.totalAmount || b.baseVisitCharge;

            return (
              <div
                key={b.id}
                className="p-4 bg-white border border-slate-200 hover:border-brand-300 rounded-3xl shadow-sm transition space-y-3 group"
              >
                {/* Header: Service + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {b.service?.slug === 'electrician' ? '⚡' : b.service?.slug === 'plumber' ? '🔧' : b.service?.slug === 'ac' ? '❄️' : b.service?.slug === 'mechanic' ? '🚗' : '🔨'}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-brand-700 transition">
                        {language === 'hi' ? b.service?.nameHi : b.service?.nameEn}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">#{b.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCancelled
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                {/* Worker & Location Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <User className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span className="font-semibold truncate">{workerName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">
                      {new Date(b.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {b.pickupAddress && (
                    <div className="sm:col-span-2 flex items-start gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{b.pickupAddress}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Amount & Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {b.payment?.status === 'COMPLETED' ? 'Amount Paid' : 'Amount Due / Estimate'}
                    </span>
                    <span className="font-black text-base text-slate-900">₹{displayAmount}</span>
                    {b.payment?.method && (
                      <span className="text-[10px] text-slate-500 ml-1">({b.payment.method})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Invoice button for completed bookings */}
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-600" />
                        <span>Invoice</span>
                      </button>
                    )}

                    <Link
                      href={`/bookings/${b.id}`}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INVOICE MODAL */}
      {selectedInvoiceBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
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
                  onClick={() => setSelectedInvoiceBooking(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To:</span>
                <p className="font-bold text-slate-900">{selectedInvoiceBooking.customer?.name || user?.phone || 'Customer'}</p>
                <p className="text-[11px] text-slate-500">{selectedInvoiceBooking.customer?.phone || user?.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Details:</span>
                <p className="font-mono font-bold text-slate-900">#{selectedInvoiceBooking.id.slice(0, 8)}</p>
                <p className="text-[11px] text-slate-500">
                  {new Date(selectedInvoiceBooking.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Service & Partner */}
            <div className="text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Service:</span>
                <span>{selectedInvoiceBooking.service?.nameEn}</span>
              </div>
              {selectedInvoiceBooking.worker && (
                <div className="flex justify-between text-slate-600">
                  <span>Service Partner:</span>
                  <span>{selectedInvoiceBooking.worker.user?.name || 'Assigned professional'}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Location:</span>
                <span className="max-w-[200px] truncate text-right">{selectedInvoiceBooking.pickupAddress}</span>
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
                  <span className="font-semibold">₹{selectedInvoiceBooking.baseVisitCharge}</span>
                </div>

                {selectedInvoiceBooking.serviceTotal > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Extra Labor / Services</span>
                    <span className="font-semibold">₹{selectedInvoiceBooking.serviceTotal}</span>
                  </div>
                )}

                {selectedInvoiceBooking.partsTotal > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Parts & Materials</span>
                    <span className="font-semibold">₹{selectedInvoiceBooking.partsTotal}</span>
                  </div>
                )}

                {selectedInvoiceBooking.nightSurgeRate > 0 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Night Surge</span>
                    <span className="font-semibold">+₹{Math.round((selectedInvoiceBooking.baseVisitCharge + selectedInvoiceBooking.serviceTotal) * selectedInvoiceBooking.nightSurgeRate)}</span>
                  </div>
                )}

                {selectedInvoiceBooking.rushSurgeRate > 1 && (
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Rush Surge</span>
                    <span className="font-semibold">+₹{Math.round((selectedInvoiceBooking.baseVisitCharge + selectedInvoiceBooking.serviceTotal) * (selectedInvoiceBooking.rushSurgeRate - 1))}</span>
                  </div>
                )}

                {selectedInvoiceBooking.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon discount</span><span>−₹{selectedInvoiceBooking.discountAmount}</span></div>}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-brand-700">
                    ₹{selectedInvoiceBooking.totalAmount || selectedInvoiceBooking.payment?.amount || selectedInvoiceBooking.baseVisitCharge}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status Badge */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span>Payment Status:</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{selectedInvoiceBooking.payment?.status === 'COMPLETED' ? `Paid via ${selectedInvoiceBooking.payment.method}` : 'Payment pending'}</span>
              </span>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-center text-slate-400">
              ServZest booking statement &bull; For help, use Contact Us. Tax invoice details require the final legal entity and GST configuration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
