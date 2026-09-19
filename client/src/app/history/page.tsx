'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { History, Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    api.getMyBookings().then((res) => {
      if (res.success) setBookings(res.bookings);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading history...</div>;
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <History className="w-6 h-6 text-brand-600" />
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{t.history}</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 bg-white border border-gray-200 rounded-3xl text-center space-y-3">
          <p className="text-xs font-bold text-gray-500">No bookings found yet.</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-brand-500 text-white font-bold text-xs rounded-xl shadow"
          >
            {t.bookNow}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="block p-4 bg-white border border-gray-200 hover:border-brand-500 rounded-2xl shadow-sm transition space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900">{b.service?.nameEn}</span>
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

              <p className="text-xs text-gray-600 flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="truncate">{b.pickupAddress}</span>
              </p>

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                <span className="font-black text-sm text-gray-900">₹{b.totalAmount || b.baseVisitCharge}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
