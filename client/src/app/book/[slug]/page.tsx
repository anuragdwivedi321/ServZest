'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { LocationPicker } from '../../../components/booking/LocationPicker';
import { ArrowRight, Calendar, Zap, Tag, X, Banknote, CheckCircle2, ShieldCheck, Clock3, Sparkles, Wrench } from 'lucide-react';

type Service = { id: string; nameEn: string; nameHi: string; visitCharge: number; items: { id: string; nameEn: string; nameHi: string; unit?: string; minPrice: number; maxPrice: number }[] };
type Bill = { baseVisitCharge: number; serviceTotal: number; nightSurgeAmount: number; rushSurgeAmount: number; discountAmount: number; totalAmount: number };
type Draft = { lat: number; lng: number; hasPin: boolean; address: string; confirmed: boolean; problem: string; itemIds: string[]; mode: 'NOW' | 'SCHEDULE'; date: string; slot: string; coupon: string };
const slots = [{ time: '09:00', label: '9 AM – 11 AM' }, { time: '11:00', label: '11 AM – 1 PM' }, { time: '14:00', label: '2 PM – 4 PM' }, { time: '16:00', label: '4 PM – 6 PM' }, { time: '18:00', label: '6 PM – 8 PM' }];
const indiaDate = (ms: number) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ lat: 28.6139, lng: 77.209, hasPin: false, address: '', confirmed: false, problem: '', itemIds: [], mode: 'NOW', date: indiaDate(Date.now()), slot: '', coupon: '' });
const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [quote, setQuote] = useState<{ key: string; bill: Bill } | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftNotice, setDraftNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  const requestKey = useRef('');
  const submittingRef = useRef(false);
  const rebookAttempted = useRef(false);
  const update = (changes: Partial<Draft>) => setDraft(value => ({ ...value, ...changes }));
  const storageKey = `servzest_checkout_${slug}`;
  useEffect(() => {
    const initial = emptyDraft();
    try {
      const saved = sessionStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      let nextDraft = parsed ? { ...initial, ...parsed } : initial;
      if (!parsed) {
        const savedLocation = localStorage.getItem('servzest_home_location');
        const homeLocation = savedLocation ? JSON.parse(savedLocation) : null;
        if (homeLocation?.label && Number.isFinite(homeLocation.lat) && Number.isFinite(homeLocation.lng)) {
          nextDraft = { ...nextDraft, lat: homeLocation.lat, lng: homeLocation.lng, address: homeLocation.label, hasPin: true, confirmed: false };
        }
      }
      setDraft(nextDraft);
      setCouponInput(parsed?.coupon || '');
      requestKey.current = sessionStorage.getItem(`${storageKey}_request`) || crypto.randomUUID();
    } catch { setDraft(initial); requestKey.current = crypto.randomUUID(); }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!ready || authLoading || user?.role !== 'CUSTOMER' || rebookAttempted.current) return;
    const previousId = new URLSearchParams(window.location.search).get('rebook');
    if (!previousId) return;
    rebookAttempted.current = true;
    api.getBooking(previousId).then(result => {
      const previous = result.booking;
      if (!result.success || previous?.service?.slug !== slug) return;
      const itemIds = (previous.items || []).map((item: { serviceItemId?: string }) => item.serviceItemId).filter(Boolean);
      setDraft(current => ({
        ...current,
        lat: previous.pickupLat,
        lng: previous.pickupLng,
        address: previous.pickupAddress,
        hasPin: true,
        confirmed: false,
        problem: previous.problemDescription || '',
        itemIds,
        mode: 'NOW',
      }));
      requestKey.current = crypto.randomUUID();
      setDraftNotice('Previous booking details are filled in. Review the location, current price and confirm before booking.');
    }).catch(() => undefined);
  }, [ready, authLoading, user, slug]);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); sessionStorage.setItem(`${storageKey}_request`, requestKey.current); } catch { /* Storage may be disabled. */ }
  }, [draft, ready, storageKey]);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    api.getServiceBySlug(slug).then(res => {
      if (!active) return;
      if (!res.success) throw new Error(res.message || 'Service not found.');
      setService(res.service);
    }).catch(err => { if (active) setLoadError(err.message || 'Could not load this service.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const scheduledAt = draft.mode === 'SCHEDULE' && draft.date && draft.slot ? new Date(`${draft.date}T${draft.slot}:00+05:30`).toISOString() : undefined;
  const validSlot = draft.mode === 'NOW' || Boolean(scheduledAt && Date.parse(scheduledAt) > now + 30 * 60000 && Date.parse(scheduledAt) < now + 7 * 86400000);
  const options = useMemo(() => ({ itemIds: draft.itemIds, scheduledAt, couponCode: draft.coupon || undefined }), [draft.itemIds, scheduledAt, draft.coupon]);
  const quoteKey = JSON.stringify({ serviceId: service?.id, ...options, userId: user?.id });
  const bill = quote?.key === quoteKey && validSlot ? quote.bill : null;
  useEffect(() => {
    if (!service || !ready || authLoading || !validSlot) { setQuoteBusy(false); return; }
    const controller = new AbortController();
    setQuoteBusy(true); setQuoteError(''); setQuote(null);
    const timer = setTimeout(async () => {
      try {
        const result = await api.estimatePrice(service.id, options, controller.signal);
        if (controller.signal.aborted) return;
        if (!result.success) throw new Error(result.message || 'Could not calculate price.');
        setQuote({ key: quoteKey, bill: result.bill });
      } catch (err: any) { if (!controller.signal.aborted) setQuoteError(err.message || 'Price unavailable. Please retry.'); }
      finally { if (!controller.signal.aborted) setQuoteBusy(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [service, ready, authLoading, validSlot, options, quoteKey, refresh]);
  const handleBook = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (submittingRef.current) return;
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/book/${slug}`)}`); return; }
    if (user.role !== 'CUSTOMER') { setError('Booking requires a customer account. Sign out and continue as Customer.'); return; }
    if (!draft.hasPin || !draft.confirmed) { setError('Select your home on the map and confirm the address.'); return; }
    if (!validSlot || !bill || !service) { setError('Select a valid time and wait for the latest price estimate.'); return; }
    submittingRef.current = true; setSubmitting(true);
    try {
      const result = await api.createBooking({ serviceId: service.id, ...options, itemIds: draft.itemIds,
        pickupLat: draft.lat, pickupLng: draft.lng, pickupAddress: draft.address.trim(),
        problemDescription: draft.problem.trim(), locationConfirmed: true, requestKey: requestKey.current, acceptedTotal: bill.totalAmount });
      if (!result.success) throw new Error(result.message || 'Could not save booking.');
      try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(`${storageKey}_request`); } catch { /* Ignore unavailable storage. */ }
      router.push(`/bookings/${result.booking.id}`);
    } catch (err: any) { setError(err.message || 'Network error. Your details are saved; please retry.'); setRefresh(n => n + 1); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  if (loading || !ready) return <div className="py-16 text-center text-slate-500" role="status">Loading booking options…</div>;
  if (loadError || !service) return <div className="p-8 bg-white border rounded-2xl space-y-4"><p role="alert">{loadError || 'Service unavailable.'}</p><button onClick={() => setRefresh(n => n + 1)} className="text-brand-700 font-bold">Try again</button></div>;
  const dates = Array.from({ length: 7 }, (_, i) => indiaDate(now + i * 86400000));
  const inputClass = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const locationReady = draft.hasPin && draft.confirmed && draft.address.trim().length >= 8;
  const buttonLabel = submitting ? 'Saving your booking…' : !user ? 'Sign in to continue' : user.role !== 'CUSTOMER' ? 'Customer account required' : draft.mode === 'SCHEDULE' ? 'Confirm scheduled booking' : 'Book now';
  const submitDisabled = authLoading || submitting || (user?.role === 'CUSTOMER' && (!bill || quoteBusy || !validSlot));
  return <form onSubmit={handleBook} className="booking-design booking-flow space-y-6 pb-8">
    <header className="booking-flow-hero"><div className="booking-flow-title"><span className="booking-mini-label"><Sparkles className="w-3.5 h-3.5" /> VERIFIED HOME SERVICE</span><h1>{language === 'hi' ? service.nameHi : service.nameEn}</h1><p>Choose the work, confirm when and where, then review the live estimate.</p><div className="booking-hero-badges"><span><Clock3 className="w-3.5 h-3.5" />~20 min arrival target</span><span><ShieldCheck className="w-3.5 h-3.5" />Approval-first pricing</span></div></div><div className="booking-service-mark"><Wrench className="w-8 h-8" /><small>VISIT FROM</small><strong>{money(service.visitCharge)}</strong></div></header>
    {draftNotice && <p role="status" className="p-3 rounded-xl border border-brand-200 bg-brand-50 text-brand-800 text-sm">{draftNotice}</p>}
    <nav className="booking-progress" aria-label="Booking progress"><a href="#booking-work" className={draft.itemIds.length ? 'is-complete' : 'is-current'}><span>{draft.itemIds.length ? <CheckCircle2 /> : '1'}</span><div><b>Service</b><small>{draft.itemIds.length ? `${draft.itemIds.length} selected` : 'Choose work'}</small></div></a><a href="#booking-time" className={validSlot ? 'is-complete' : ''}><span>{validSlot ? <CheckCircle2 /> : '2'}</span><div><b>Time</b><small>{draft.mode === 'NOW' ? 'Book now' : draft.slot || 'Choose slot'}</small></div></a><a href="#booking-location" className={locationReady ? 'is-complete' : ''}><span>{locationReady ? <CheckCircle2 /> : '3'}</span><div><b>Location</b><small>{locationReady ? 'Confirmed' : 'Add address'}</small></div></a><a href="#booking-review" className={bill ? 'is-complete' : ''}><span>{bill ? <CheckCircle2 /> : '4'}</span><div><b>Review</b><small>{bill ? money(bill.totalAmount) : 'Live estimate'}</small></div></a></nav>
    <fieldset disabled={submitting} className="booking-flow-grid grid grid-cols-1 lg:grid-cols-12 gap-7 disabled:opacity-70">
      <div className="booking-flow-main lg:col-span-7 space-y-5">
        <section id="booking-work" className="booking-work-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"><div className="p-5 border-b border-slate-100"><div className="booking-step-heading"><span>1</span><div><small>WHAT</small><h2>Select the work you need</h2></div></div><p className="text-xs text-slate-500 mt-3">Choose known tasks, or leave all unchecked for a diagnosis visit.</p></div>{service.items.map(item => <label key={item.id} className={`booking-work-option flex items-start gap-3 p-4 border-b last:border-0 border-slate-100 cursor-pointer ${draft.itemIds.includes(item.id) ? 'is-selected bg-brand-50' : 'hover:bg-slate-50'}`}><input type="checkbox" className="mt-1 accent-teal-600" checked={draft.itemIds.includes(item.id)} onChange={e => update({ itemIds: e.target.checked ? [...draft.itemIds, item.id] : draft.itemIds.filter(id => id !== item.id) })} /><span className="flex-1 text-sm"><span className="font-bold block">{language === 'hi' ? item.nameHi : item.nameEn}</span><span className="text-xs text-slate-500">{item.unit === 'per hour' ? 'Per hour · minimum 2 hours' : item.unit || 'Per job'}</span></span><span className="text-xs font-bold whitespace-nowrap">{money(item.minPrice)}{item.maxPrice !== item.minPrice ? ` – ${money(item.maxPrice)}` : ''}</span></label>)}<p className="booking-approval-note p-4 text-xs text-slate-500 bg-slate-50"><ShieldCheck className="w-4 h-4" />Extra work or a price difference always needs your approval.</p></section>
        <section id="booking-time" className="booking-time-card"><div className="booking-step-heading"><span>2</span><div><small>WHEN</small><h2>When should we come?</h2></div></div><div className="booking-time-toggle flex gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl">{(['NOW', 'SCHEDULE'] as const).map(mode => <button key={mode} type="button" aria-pressed={draft.mode === mode} onClick={() => update({ mode })} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold ${draft.mode === mode ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}>{mode === 'NOW' ? <Zap className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}{mode === 'NOW' ? t.bookNow : t.scheduleForLater}</button>)}</div></section>
        {draft.mode === 'SCHEDULE' && <section className="bg-white p-5 border border-brand-200 rounded-2xl space-y-4"><h2 className="font-bold">Choose your visit window</h2><div className="flex flex-wrap gap-2">{dates.map(date => <button key={date} type="button" aria-pressed={draft.date === date} onClick={() => update({ date, slot: '' })} className={`rounded-xl px-3 py-2 text-xs border font-bold ${draft.date === date ? 'bg-brand-50 border-brand-600 text-brand-700' : 'border-slate-200'}`}>{new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', weekday: 'short' })}</button>)}</div><div className="grid grid-cols-2 gap-2">{slots.map(slot => <button key={slot.time} type="button" disabled={Date.parse(`${draft.date}T${slot.time}:00+05:30`) <= now + 30 * 60000} aria-pressed={draft.slot === slot.time} onClick={() => update({ slot: slot.time })} className={`p-3 text-xs font-bold rounded-xl border disabled:opacity-30 disabled:cursor-not-allowed ${draft.slot === slot.time ? 'bg-brand-50 border-brand-600 text-brand-700' : 'border-slate-200'}`}>{slot.label}</button>)}</div><p className="text-xs text-slate-500">All times are India time (IST). Matching starts at your selected window. Availability is confirmed when a professional accepts.</p></section>}
        <div id="booking-location" className="booking-location-step"><LocationPicker value={draft} onChange={update} required={Boolean(user)} /></div>
        <section className="booking-notes-card bg-white border border-slate-200 rounded-2xl p-5 space-y-3"><div className="booking-step-heading compact"><span>+</span><div><small>HELPFUL DETAILS</small><h2>Anything the professional should know?</h2></div></div><label htmlFor="problem" className="sr-only">Tell the professional what needs fixing</label><textarea id="problem" maxLength={1000} rows={3} value={draft.problem} onChange={e => update({ problem: e.target.value })} placeholder="Describe the issue, access instructions or parts to bring…" className={inputClass} /><p className="booking-helper-text">Photos and chat can be shared after a professional accepts the booking.</p></section>
      </div>
      <div className="booking-flow-sidebar lg:col-span-5 space-y-5">
        <section className="booking-coupon-card bg-white border border-slate-200 rounded-2xl p-5 space-y-3"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold flex gap-2 items-center"><Tag className="w-4 h-4 text-brand-600" />Offers & promo</h2><span className="booking-promo-pill">WELCOME50</span></div>{draft.coupon ? <div className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-xl"><span>{draft.coupon}{bill && !quoteError ? ` · ${money(bill.discountAmount)} saved` : ' · not applied yet'}</span><button type="button" aria-label="Remove coupon" onClick={() => { update({ coupon: '' }); setCouponInput(''); }}><X className="w-4 h-4" /></button></div> : <div className="flex gap-2"><input aria-label="Coupon code" value={couponInput} maxLength={30} onChange={e => setCouponInput(e.target.value)} className={`${inputClass} min-w-0 uppercase`} placeholder="Enter promo code" /><button type="button" disabled={!couponInput.trim()} onClick={() => update({ coupon: couponInput.trim().toUpperCase() })} className="booking-apply-button bg-slate-900 text-white px-4 rounded-xl font-bold text-sm disabled:opacity-40">Apply</button></div>}{!user && <p className="text-xs text-slate-500">Sign in to use your welcome discount. Your selections will be saved.</p>}</section>
        <section id="booking-review" className="booking-summary-card bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-sm shadow-sm" aria-live="polite"><div className="booking-summary-head"><div><span className="booking-mini-label">STEP 4 · REVIEW</span><h2>Booking summary</h2></div>{quoteBusy && <span>Updating…</span>}</div>{!validSlot ? <p className="text-amber-700">Choose an available date and time slot.</p> : quoteBusy ? <div className="booking-price-skeleton" /> : quoteError ? <div><p role="alert" className="text-red-600">{quoteError}</p><button type="button" onClick={() => setRefresh(n => n + 1)} className="text-brand-700 mt-2 font-bold text-xs">Retry estimate</button></div> : bill ? <><div className="flex justify-between"><span>Visit charge</span><b>{money(bill.baseVisitCharge)}</b></div>{bill.serviceTotal > 0 && <div className="flex justify-between"><span>Selected work</span><b>{money(bill.serviceTotal)}</b></div>}{bill.nightSurgeAmount > 0 && <div className="flex justify-between text-slate-500"><span>Night surcharge (10 PM – 6 AM IST)</span><span>+{money(bill.nightSurgeAmount)}</span></div>}{bill.rushSurgeAmount > 0 && <div className="flex justify-between text-slate-500"><span>Rush surcharge</span><span>+{money(bill.rushSurgeAmount)}</span></div>}{bill.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Welcome discount</span><b>−{money(bill.discountAmount)}</b></div>}<div className="booking-total-row flex justify-between border-t pt-3 text-lg font-black"><span>Estimated total</span><span className="text-brand-700">{money(bill.totalAmount)}</span></div></> : <p>Price unavailable.</p>}<div className="booking-summary-promise"><CheckCircle2 className="w-4 h-4" /><span><b>No surprise charges</b><small>Parts and extra repairs are added only after your approval.</small></span></div></section>
        <div className="booking-payment-note p-4 bg-brand-50 border border-brand-200 rounded-2xl flex items-start gap-3 text-sm"><Banknote className="w-5 h-5 text-brand-700 shrink-0" /><div><b>Pay after the service</b><p className="text-xs text-slate-600 mt-1">Use cash or scan the professional’s verified UPI QR after the final bill is ready.</p></div></div>
        {error && <p role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">{error}</p>}
        <button type="submit" disabled={submitDisabled} className="booking-desktop-submit w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-md flex justify-center items-center gap-2">{buttonLabel}<ArrowRight className="w-5 h-5" /></button>
      </div>
    </fieldset>
    <div className="booking-mobile-checkout"><div><small>{quoteBusy ? 'Updating estimate…' : 'ESTIMATED TOTAL'}</small><strong>{bill ? money(bill.totalAmount) : money(service.visitCharge)}</strong></div><button type="submit" disabled={submitDisabled}>{buttonLabel}<ArrowRight className="w-4 h-4" /></button></div>
  </form>;
}
