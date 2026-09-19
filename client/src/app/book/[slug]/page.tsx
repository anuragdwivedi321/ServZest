'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { LeafletMap } from '../../../components/map/LeafletMap';
import { MapPin, Navigation, Info, ArrowRight, ShieldCheck } from 'lucide-react';

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Default coordinates: Connaught Place, New Delhi
  const [lat, setLat] = useState<number>(28.6139);
  const [lng, setLng] = useState<number>(77.2090);
  const [address, setAddress] = useState<string>('Connaught Place, New Delhi');

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        (err) => console.log('Geolocation fallback used', err)
      );
    }

    api.getServiceBySlug(slug).then((res) => {
      if (res.success) {
        setService(res.service);
        // Calculate initial price estimate
        fetchEstimate(res.service.id);
      }
      setLoading(false);
    });
  }, [slug]);

  const fetchEstimate = async (serviceId: string) => {
    try {
      const res = await api.estimatePrice(serviceId);
      if (res.success) {
        setEstimate(res.bill);
      }
    } catch (e) {
      console.error('Error fetching estimate', e);
    }
  };

  const handleBook = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!address) {
      setError('Please provide your address or landmark');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await api.createBooking({
        serviceId: service.id,
        pickupLat: lat,
        pickupLng: lng,
        pickupAddress: address,
      });

      if (res.success && res.booking) {
        router.push(`/bookings/${res.booking.id}`);
      } else {
        setError(res.message || 'Failed to initiate booking');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <div className="h-8 bg-gray-200 animate-pulse rounded-xl w-1/2" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
        <div className="h-32 bg-gray-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!service) {
    return <div className="p-8 text-center text-gray-500 font-bold">Service not found</div>;
  }

  const serviceName = language === 'hi' ? service.nameHi : service.nameEn;

  return (
    <div className="space-y-5 pb-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{serviceName}</h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {t.visitCharge}: <span className="font-bold text-gray-800">₹{service.visitCharge}</span>
        </p>
      </div>

      {/* Map & Location Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>{t.setPickup}</span>
          </label>
          <span className="text-[11px] text-gray-500">Drag pin to adjust</span>
        </div>

        <LeafletMap
          center={[lat, lng]}
          customerLocation={[lat, lng]}
          isDraggable={true}
          onLocationChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }}
          className="h-56 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        />

        <div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t.pickupAddress}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
        </div>
      </div>

      {/* Rate Card Preview */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-black text-gray-900 tracking-tight">{t.rateCard}</h2>
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden shadow-sm">
          {service.items?.map((item: any) => (
            <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-gray-800">{language === 'hi' ? item.nameHi : item.nameEn}</p>
                {item.unit && <p className="text-[10px] text-gray-400 capitalize">{item.unit}</p>}
              </div>
              <div className="font-black text-gray-900">
                {item.minPrice === item.maxPrice
                  ? `₹${item.minPrice}`
                  : `₹${item.minPrice} - ₹${item.maxPrice}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estimated Bill Breakdown */}
      {estimate && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <span>{t.visitCharge}</span>
            <span>₹{estimate.baseVisitCharge}</span>
          </div>

          {estimate.isNightTime && (
            <div className="flex items-center justify-between text-amber-800">
              <span>{t.nightSurge}</span>
              <span>+₹{estimate.nightSurgeAmount}</span>
            </div>
          )}

          {estimate.rushSurgeAmount > 0 && (
            <div className="flex items-center justify-between text-amber-800">
              <span>{t.rushSurge}</span>
              <span>+₹{estimate.rushSurgeAmount}</span>
            </div>
          )}

          <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between font-black text-sm text-gray-900">
            <span>{t.estimatedPrice}</span>
            <span className="text-base text-brand-700">₹{estimate.totalAmount}</span>
          </div>

          <p className="text-[10px] text-amber-700 leading-tight pt-1">
            * Visit charge is included. Final bill depends on exact services or parts selected with worker.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-center">
          {error}
        </p>
      )}

      {/* Book Button */}
      <button
        onClick={handleBook}
        disabled={submitting}
        className="w-full py-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
      >
        <span>{submitting ? 'Finding Worker...' : t.bookNow}</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
