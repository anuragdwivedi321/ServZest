'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { AirVent, ArrowRight, ArrowUp, BadgeCheck, Bike, Calendar, CheckCircle2, Clock3, CreditCard, HardHat, Headphones, IndianRupee, LocateFixed, MapPin, Mic, Search, ShieldCheck, Sparkles, Star, Users, Wrench, X, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Service = {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  visitCharge: number;
  items?: Array<{ nameEn: string }>;
  market?: { averageRating: number | null; reviewCount: number; onlineWorkers: number; completedBookings: number };
};
type Booking = { id: string; status: string; service?: Service; worker?: { user?: { name?: string } }; createdAt: string };
type LocationSuggestion = { label: string; lat: number; lng: number; needsAddress?: boolean };

const serviceMeta: Record<string, { Icon: LucideIcon; description: string; hindi: string }> = {
  electrician: { Icon: Zap, description: 'Switches, wiring & appliance fixes', hindi: 'वायरिंग, स्विच और उपकरण' },
  plumber: { Icon: Wrench, description: 'Leaks, taps & water fittings', hindi: 'लीकेज, नल और फिटिंग' },
  ac: { Icon: AirVent, description: 'Service, cooling & installation', hindi: 'सर्विस, कूलिंग और इंस्टॉलेशन' },
  majdoor: { Icon: HardHat, description: 'Moving, loading & skilled help', hindi: 'शिफ्टिंग और घरेलू सहायता' },
  mechanic: { Icon: Bike, description: 'Puncture, battery & roadside help', hindi: 'पंचर और रोडसाइड सहायता' },
};
const rotatingSearches = ['Plumber', 'Electrician', 'AC repair', 'Mechanic', 'Home helper'];
const servicePreview = [
  { slug: 'electrician', nameEn: 'Electrician', nameHi: 'इलेक्ट्रीशियन' },
  { slug: 'plumber', nameEn: 'Plumber', nameHi: 'प्लंबर' },
  { slug: 'ac', nameEn: 'AC repair', nameHi: 'एसी रिपेयर' },
  { slug: 'majdoor', nameEn: 'Home helper', nameHi: 'घरेलू सहायक' },
  { slug: 'mechanic', nameEn: 'Mechanic', nameHi: 'मैकेनिक' },
];
const heroStories = [
  { slug: 'electrician', image: '/images/hero/electrician.webp', Icon: Zap, titleEn: 'Electrician at work', titleHi: 'काम पर इलेक्ट्रीशियन', copyEn: 'Safe wiring and switch repairs', copyHi: 'सुरक्षित वायरिंग और स्विच मरम्मत' },
  { slug: 'plumber', image: '/images/hero/plumber.webp', Icon: Wrench, titleEn: 'Plumber at work', titleHi: 'काम पर प्लंबर', copyEn: 'Leaks and fittings fixed cleanly', copyHi: 'लीकेज और फिटिंग की साफ़ मरम्मत' },
  { slug: 'ac', image: '/images/hero/ac-technician.webp', Icon: AirVent, titleEn: 'AC expert at work', titleHi: 'काम पर AC एक्सपर्ट', copyEn: 'Careful service for better cooling', copyHi: 'बेहतर कूलिंग के लिए सावधानी से सर्विस' },
  { slug: 'mechanic', image: '/images/hero/mechanic.webp', Icon: Bike, titleEn: 'Mechanic at work', titleHi: 'काम पर मैकेनिक', copyEn: 'Roadside support when you need it', copyHi: 'ज़रूरत के समय रोडसाइड सहायता' },
];
const HOME_LOCATION_KEY = 'servzest_home_location';

export default function HomePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const text = (english: string, hindi: string) => language === 'hi' ? hindi : english;
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [location, setLocation] = useState<LocationSuggestion | null>(null);
  const [locationResults, setLocationResults] = useState<LocationSuggestion[]>([]);
  const [locationSearchBusy, setLocationSearchBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [showTop, setShowTop] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [previousHeroIndex, setPreviousHeroIndex] = useState<number | null>(null);
  const [heroPaused, setHeroPaused] = useState(false);
  const heroTouchStart = useRef<number | null>(null);
  const gpsRequest = useRef(0);
  useEffect(() => () => { gpsRequest.current++; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getServices();
      if (!result.success) throw new Error(result.message);
      setServices(result.services);
    } catch {
      setError(text('Services could not load. Please retry.', 'सेवाएँ लोड नहीं हुईं। दोबारा कोशिश करें।'));
    } finally { setLoading(false); }
  }, [language]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim();
    if (initialQuery) {
      setQuery(initialQuery.slice(0, 80));
      window.requestAnimationFrame(() => document.getElementById('services-grid')?.scrollIntoView({ block: 'start' }));
    }
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HOME_LOCATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LocationSuggestion;
        if (parsed.label && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) setLocation(parsed);
      }
    } catch { /* Storage may be unavailable. */ }
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setSearchIndex(index => (index + 1) % rotatingSearches.length), 2400);
    const onScroll = () => setShowTop(window.scrollY > 650);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearInterval(timer); window.removeEventListener('scroll', onScroll); };
  }, []);
  useEffect(() => {
    if (heroPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setHeroIndex(index => { setPreviousHeroIndex(index); return (index + 1) % heroStories.length; }), 8000);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroIndex]);
  useEffect(() => {
    if (authLoading || user?.role !== 'CUSTOMER') return;
    api.getMyBookings().then(result => { if (result.success) setBookings(result.bookings || []); }).catch(() => undefined);
  }, [authLoading, user]);
  useEffect(() => {
    if (!locationOpen || locationQuery.trim().length < 3) {
      setLocationResults([]);
      setLocationSearchBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationSearchBusy(true);
      setLocationMessage('');
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(locationQuery.trim())}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setLocationResults(result.results || []);
        if (!result.results?.length) setLocationMessage(text('No matching area found. Add your city or landmark.', 'लोकेशन नहीं मिली। शहर या लैंडमार्क भी लिखें।'));
      } catch {
        if (!controller.signal.aborted) setLocationMessage(text('Location search is unavailable. Try GPS.', 'लोकेशन सर्च उपलब्ध नहीं है। GPS आज़माएँ।'));
      } finally { if (!controller.signal.aborted) setLocationSearchBusy(false); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locationOpen, locationQuery, language]);

  const saveLocation = (next: LocationSuggestion) => {
    gpsRequest.current++;
    setLocation(next);
    setLocationQuery('');
    setLocationOpen(false);
    setLocationResults([]);
    setLocationMessage('');
    setGpsBusy(false);
    try { localStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  };
  const locateMe = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationMessage(text('GPS needs HTTPS or localhost. Search your area instead.', 'GPS के लिए HTTPS या localhost चाहिए। अपना एरिया खोजें।'));
      return;
    }
    const request = ++gpsRequest.current;
    setLocationQuery('');
    setLocationResults([]);
    setGpsBusy(true);
    setLocationMessage(text('Finding your location…', 'आपकी लोकेशन खोज रहे हैं…'));
    const onSuccess = async (position: GeolocationPosition) => {
      if (request !== gpsRequest.current) return;
      const { latitude: lat, longitude: lng } = position.coords;
      const fallback: LocationSuggestion = {
        label: text(`Approx. location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, `अनुमानित लोकेशन (${lat.toFixed(5)}, ${lng.toFixed(5)})`),
        lat, lng, needsAddress: true,
      };
      let selected = fallback;
      try {
        const response = await fetch(`/api/locations?reverse=1&lat=${lat}&lng=${lng}`, { signal: AbortSignal.timeout(9000) });
        if (!response.ok) throw new Error('Reverse geocoding unavailable');
        const result = await response.json();
        const match = result.results?.[0] as LocationSuggestion | undefined;
        if (match?.label) {
          const approximate = position.coords.accuracy > 150;
          selected = { label: approximate ? text(`Near ${match.label}`, `${match.label} के आसपास`) : match.label, lat, lng, needsAddress: approximate };
        }
      } catch { /* Keep the coordinates even if address lookup fails. */ }
      if (request === gpsRequest.current) saveLocation(selected);
    };
    const onFailure = (error: GeolocationPositionError, wasPrecise: boolean) => {
      if (request !== gpsRequest.current) return;
      if (error.code !== 1 && wasPrecise) {
        setLocationMessage(text('Precise GPS unavailable. Trying nearby network location…', 'सटीक GPS नहीं मिला। नेटवर्क लोकेशन खोज रहे हैं…'));
        getPosition(false);
        return;
      }
      setGpsBusy(false);
      setLocationMessage(error.code === 1
        ? text('Location is blocked for this site. Allow it in your browser settings, then retry.', 'इस साइट के लिए लोकेशन बंद है। ब्राउज़र सेटिंग में अनुमति देकर दोबारा कोशिश करें।')
        : error.code === 3
          ? text('Location timed out. Turn on device location or search your area.', 'लोकेशन में बहुत समय लगा। डिवाइस लोकेशन चालू करें या अपना एरिया खोजें।')
          : text('Your device could not determine its location. Turn on device location or search your area.', 'डिवाइस लोकेशन नहीं बता पाया। डिवाइस लोकेशन चालू करें या अपना एरिया खोजें।'));
    };
    const getPosition = (precise: boolean) => {
      try {
        navigator.geolocation.getCurrentPosition(onSuccess, error => onFailure(error, precise), {
          enableHighAccuracy: precise,
          timeout: precise ? 8000 : 12000,
          maximumAge: precise ? 30000 : 300000,
        });
      } catch {
        setGpsBusy(false);
        setLocationMessage(text('Location is unavailable in this browser. Search your area.', 'इस ब्राउज़र में लोकेशन उपलब्ध नहीं है। अपना एरिया खोजें।'));
      }
    };
    getPosition(true);
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return services;
    return services.filter(service => `${service.nameEn} ${service.nameHi} ${service.slug} ${(service.items || []).map(item => item.nameEn).join(' ')}`.toLowerCase().includes(term));
  }, [query, services]);
  const repeatBookings = useMemo(() => {
    const seen = new Set<string>();
    return bookings.filter(booking => {
      const slug = booking.service?.slug;
      if (booking.status !== 'COMPLETED' || !slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    }).slice(0, 5);
  }, [bookings]);

  const startVoiceSearch = () => {
    const BrowserRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!BrowserRecognition) {
      setSearchMessage(text('Voice search is not supported in this browser.', 'इस ब्राउज़र में वॉइस सर्च उपलब्ध नहीं है।'));
      return;
    }
    const recognition = new BrowserRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setSearchMessage(text('Listening…', 'सुन रहे हैं…')); };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setSearchMessage(text('Could not hear that. Try again.', 'आवाज़ समझ नहीं आई। दोबारा कोशिश करें।')); };
    recognition.onresult = (event: any) => {
      const value = event.results?.[0]?.[0]?.transcript || '';
      setQuery(value);
      setSearchMessage(value ? text(`Showing results for “${value}”`, `“${value}” के परिणाम`) : '');
    };
    recognition.start();
  };
  const submitSearch = () => {
    if (filtered.length === 1) router.push(`/book/${filtered[0].slug}`);
    else document.getElementById('quick-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const showPreviousStory = () => setHeroIndex(index => { setPreviousHeroIndex(index); return (index - 1 + heroStories.length) % heroStories.length; });
  const showNextStory = () => setHeroIndex(index => { setPreviousHeroIndex(index); return (index + 1) % heroStories.length; });
  const finishStorySwipe = (clientX: number) => {
    if (heroTouchStart.current === null) return;
    const distance = clientX - heroTouchStart.current;
    heroTouchStart.current = null;
    if (Math.abs(distance) < 42) return;
    if (distance > 0) showPreviousStory();
    else showNextStory();
  };

  return <div className="rapid-home reference-home">
    {/* Top Sub-Bar: Address & Speed */}
    <section className="reference-location" aria-label="Service speed and location">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="fill-emerald-600 text-emerald-600" />
        </div>
        <div>
          <span className="text-[10px] font-black tracking-wider text-emerald-800 uppercase block">{text('ARRIVAL TARGET', 'आने का लक्ष्य')}</span>
          <strong className="text-sm sm:text-base font-bold text-slate-900">{text('Around 20 min arrival target', 'लगभग 20 मिनट में आने का लक्ष्य')}</strong>
        </div>
      </div>

      <div className="relative w-full md:w-auto min-w-0 md:min-w-[280px]">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
          onClick={() => setLocationOpen(open => !open)}
          aria-expanded={locationOpen}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <MapPin size={17} className="text-[#084c3e] flex-shrink-0" />
            <div className="min-w-0">
              <small className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">{text('SERVICE AT', 'सेवा का पता')}</small>
              <strong className="block text-xs font-bold text-slate-900 truncate max-w-[220px]">{location?.label || text('Select your area', 'अपना एरिया चुनें')}</strong>
            </div>
          </div>
          <ArrowRight size={15} className="text-slate-400 flex-shrink-0" />
        </button>

        {locationOpen && (
          <div className="absolute right-0 top-full mt-2 z-50 w-full sm:w-96 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50">
              <Search size={16} className="text-slate-400" />
              <input
                autoFocus
                value={locationQuery}
                onChange={event => { setLocationQuery(event.target.value); setLocationMessage(''); }}
                placeholder={text('Search area, address or landmark', 'एरिया, पता या लैंडमार्क खोजें')}
                className="w-full bg-transparent text-xs outline-none text-slate-800"
              />
              {locationQuery && (
                <button type="button" aria-label={text('Clear address search', 'पता खोज साफ़ करें')} onClick={() => { setLocationQuery(''); setLocationResults([]); setLocationMessage(''); }}>
                  <X size={15} className="text-slate-400" />
                </button>
              )}
            </div>
            <button
              type="button"
              className="w-full mt-2.5 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition"
              onClick={locateMe}
              disabled={gpsBusy}
            >
              <LocateFixed size={16} />
              {gpsBusy ? text('Locating…', 'खोज रहे हैं…') : text('Use my current location', 'मेरी मौजूदा लोकेशन')}
            </button>
            {locationResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto mt-2 divide-y divide-slate-100">
                {locationResults.map(item => (
                  <button
                    type="button"
                    key={`${item.lat}-${item.lng}`}
                    onClick={() => saveLocation(item)}
                    className="w-full text-left py-2 px-1 text-xs text-slate-700 hover:text-emerald-700 flex items-start gap-2"
                  >
                    <MapPin size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            {locationSearchBusy && <p role="status" className="text-[11px] text-slate-500 mt-2">{text('Searching addresses…', 'पते खोज रहे हैं…')}</p>}
            {locationMessage && <p role="status" className="text-[11px] text-amber-700 mt-2">{locationMessage}</p>}
          </div>
        )}
      </div>
    </section>

    {/* HERO SECTION (Screenshot layout with deep teal text, orange CTA, and worker visuals) */}
    <section className="reference-hero">
      <div className="reference-hero-copy">
        <span className="text-[11px] font-extrabold tracking-widest text-slate-500 uppercase mb-3 block">
          {text('HOME SERVICES, BUILT AROUND YOU', 'आपके लिए बनी घरेलू सेवाएँ')}
        </span>
        <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.08] tracking-tight text-[#063b31]">
          {text('Trusted Professionals,', 'सत्यापित प्रोफेशनल्स,')}<br />
          <span className="text-[#084c3e]">{text('Right at Your Doorstep', 'सीधे आपके दरवाज़े पर')}</span>
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-4 max-w-xl">
          {text(
            'From urgent repairs to everyday upkeep, find local professionals, see clear prices and follow your booking from one place.',
            'ज़रूरी मरम्मत से लेकर रोज़ की देखभाल तक, नज़दीकी प्रोफेशनल खोजें, कीमत देखें और अपनी बुकिंग ट्रैक करें।'
          )}
        </p>

        {/* Dual Call to Action Buttons matching screenshot */}
        <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 mt-7 w-full sm:w-auto">
          <Link
            href="#services-grid"
            className="btn-orange w-full sm:w-auto text-center"
          >
            <Calendar size={18} />
            <span>{text('Book a Service →', 'सेवा बुक करें →')}</span>
          </Link>
          <Link
            href="/login?role=WORKER"
            className="btn-teal-outline w-full sm:w-auto text-center"
          >
            <Users size={18} />
            <span>{text('Join as Professional', 'प्रोफेशनल के रूप में जुड़ें')}</span>
          </Link>
        </div>

        {/* India Platform & Cities badges */}
        <div className="reference-hero-facts">
          <span className="flex items-center gap-1.5">
            <MapPin size={15} className="text-[#084c3e]" />
            {text('Check availability for your area', 'अपने क्षेत्र में उपलब्धता देखें')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-base leading-none">🇮🇳</span>
            {text('A Made for India Platform', 'मेड फॉर इंडिया प्लेटफॉर्म')}
          </span>
        </div>
      </div>

      {/* Right Hero Story Visual */}
      <div className="reference-hero-visual" role="region" aria-roledescription="carousel" aria-label={text('Professionals at work', 'काम करते प्रोफेशनल')} onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onTouchStart={event => { heroTouchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const touch = event.changedTouches[0]; if (touch) finishStorySwipe(touch.clientX); else heroTouchStart.current = null; }}>
        <div className="reference-hero-media">
          {heroStories.map((story, index) => (
            <Image
              key={story.slug}
              src={story.image}
              alt={index === heroIndex ? (language === 'hi' ? story.titleHi : story.titleEn) : ''}
              fill
              priority={index === 0}
              sizes="(max-width: 767px) 100vw, 50vw"
              aria-hidden={index !== heroIndex}
              className={index === heroIndex ? 'is-active' : index === previousHeroIndex ? 'is-leaving-left' : 'is-waiting-right'}
            />
          ))}
        </div>
        <div className="reference-hero-shade" />

        {/* Informational caption; photos rotate automatically and support touch swipe. */}
        <div className="reference-story-info">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold text-emerald-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {text('Service professional', 'सर्विस प्रोफेशनल')}
            </span>
            <strong className="block text-sm font-bold">
              {language === 'hi' ? heroStories[heroIndex].titleHi : heroStories[heroIndex].titleEn}
            </strong>
          </div>
        </div>
        <div className="reference-story-dots" aria-hidden="true">{heroStories.map((story, index) => <span key={story.slug} className={index === heroIndex ? 'is-active' : ''} />)}</div>
      </div>
    </section>

    <section className="trust-bar-container" aria-label="Why choose ServZest">
      <div className="trust-item">
        <div className="trust-icon-badge">
          <CheckCircle2 size={22} />
        </div>
        <div className="trust-text">
          <strong>{text('Reviewed professionals', 'समीक्षित प्रोफेशनल्स')}</strong>
          <span>{text('Admin approval before jobs', 'काम से पहले एडमिन मंज़ूरी')}</span>
        </div>
      </div>

      <div className="trust-item">
        <div className="trust-icon-badge">
          <IndianRupee size={22} />
        </div>
        <div className="trust-text">
          <strong>{text('Transparent Pricing', 'पारदर्शी दरें')}</strong>
          <span>{text('Approve extras before work', 'अतिरिक्त काम को पहले मंज़ूरी')}</span>
        </div>
      </div>

      <div className="trust-item">
        <div className="trust-icon-badge">
          <Zap size={22} />
        </div>
        <div className="trust-text">
          <strong>{text('Quick Service', 'त्वरित सेवा')}</strong>
          <span>{text('Arrival estimate after matching', 'मैच के बाद आने का अनुमान')}</span>
        </div>
      </div>

      <div className="trust-item">
        <div className="trust-icon-badge">
          <CreditCard size={22} />
        </div>
        <div className="trust-text">
          <strong>{text('Flexible payment', 'आसान भुगतान')}</strong>
          <span>{text('Cash or professional UPI QR', 'नकद या प्रोफेशनल UPI QR')}</span>
        </div>
      </div>
    </section>

    <section id="services-grid" className="reference-services">
      <div className="reference-section-heading">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#063b31] tracking-tight">
            {text('Our Services', 'हमारी सेवाएँ')}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {text('Professional help for every need, at your fingertips.', 'हर ज़रूरत के लिए प्रोफेशनल मदद, सीधे आपके फोन पर।')}
          </p>
        </div>
        {!loading && !error && services.length > 0 && <span>{text(`${services.length} services to explore`, `${services.length} सेवाएँ देखें`)}</span>}
      </div>

      <div className="reference-service-search" role="search">
        <Search size={19} aria-hidden="true" />
        <input aria-label={text('Search services', 'सेवा खोजें')} value={query} onChange={event => { setQuery(event.target.value); setSearchMessage(''); }} onKeyDown={event => { if (event.key === 'Enter') submitSearch(); }} placeholder={text(`Search “${rotatingSearches[searchIndex]}”`, `“${rotatingSearches[searchIndex]}” खोजें`)} />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={text('Clear search', 'खोज हटाएँ')}><X size={18} /></button>}
        <button type="button" onClick={startVoiceSearch} className={listening ? 'is-listening' : ''} aria-label={text('Search by voice', 'बोलकर खोजें')}><Mic size={18} /></button>
      </div>
      {searchMessage && <p role="status" className="reference-search-message">{searchMessage}</p>}
      {query && filtered.length > 0 && <div className="reference-search-suggestions" aria-label={text('Search suggestions', 'खोज सुझाव')}>{filtered.slice(0, 5).map(service => <Link key={service.id} href={`/book/${service.slug}`}>{language === 'hi' ? service.nameHi : service.nameEn}<ArrowRight size={15} /></Link>)}</div>}

      {loading && (
        <div className="reference-service-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="reference-service-notice" role="status">
          <p>{text('Bookings are temporarily unavailable. Browse our service categories while we reconnect.', 'बुकिंग अभी उपलब्ध नहीं है। दोबारा जुड़ने तक हमारी सेवाएँ देखें।')}</p>
          <button type="button" onClick={load}>
            {text('Try again', 'दोबारा कोशिश करें')}
          </button>
        </div>
      )}

      {error && (
        <div className="reference-service-grid">
          {servicePreview.filter(service => `${service.nameEn} ${service.nameHi} ${serviceMeta[service.slug].description}`.toLowerCase().includes(query.trim().toLowerCase())).map(service => {
            const Icon = serviceMeta[service.slug].Icon;
            return <div key={service.slug} className="services-card reference-service-preview">
              <div className="reference-card-head">
                <div className={`service-icon-box service-icon-${service.slug === 'majdoor' ? 'cleaning' : service.slug === 'ac' ? 'ac' : service.slug}`}><Icon size={25} strokeWidth={2.2} /></div>
                <div><h3>{language === 'hi' ? service.nameHi : service.nameEn}</h3><p>{text(serviceMeta[service.slug].description, serviceMeta[service.slug].hindi)}</p></div>
              </div>
              <div className="reference-card-foot"><span className="service-available-badge is-neutral">{text('Booking paused', 'बुकिंग रुकी है')}</span></div>
            </div>;
          })}
        </div>
      )}

      {!loading && !error && (
        <div className="reference-service-grid">
          {filtered.map(service => {
            const slug = service.slug;
            const Icon = serviceMeta[slug]?.Icon || Wrench;
            const iconClass =
              slug === 'electrician' ? 'service-icon-electrician' :
              slug === 'plumber' ? 'service-icon-plumber' :
              slug === 'majdoor' ? 'service-icon-cleaning' :
              slug === 'ac' ? 'service-icon-ac' :
              'service-icon-mechanic';

            return (
              <Link
                href={`/book/${service.slug}`}
                key={service.id}
                className="services-card group"
              >
                <div className="reference-card-head">
                  <div className={`service-icon-box ${iconClass}`}>
                    <Icon size={26} strokeWidth={2.2} />
                  </div>
                  <div><h3>{language === 'hi' ? service.nameHi : service.nameEn}</h3><p>{text(serviceMeta[slug]?.description || 'Home maintenance and repair.', serviceMeta[slug]?.hindi || 'घरेलू मरम्मत एवं देखभाल।')}</p></div>
                </div>
                <div className="reference-card-foot">
                  <span className={`service-available-badge ${service.market?.onlineWorkers ? '' : 'is-neutral'}`}>
                    <span className="service-available-dot" />
                    {service.market?.onlineWorkers ? text(`${service.market.onlineWorkers} online`, `${service.market.onlineWorkers} ऑनलाइन`) : text('Check availability', 'उपलब्धता देखें')}
                  </span>
                  <span className="reference-service-price">{text('Visit from', 'विज़िट शुल्क')} <b>₹{Number(service.visitCharge).toLocaleString('en-IN')}</b></span>
                  <div className="service-arrow-btn">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && <div className="reference-empty-search"><p>{text('No matching service found.', 'मिलती हुई सेवा नहीं मिली।')}</p><button type="button" onClick={() => setQuery('')}>{text('Show all services', 'सभी सेवाएँ देखें')}</button></div>}
    </section>

    {repeatBookings.length > 0 && <section className="reference-rebook"><div className="reference-section-heading"><div><h2>{text('Book again', 'फिर से बुक करें')}</h2><p>{text('Pick up where you left off with a previous service.', 'अपनी पिछली सेवा को आसानी से फिर चुनें।')}</p></div><Link href="/history">{text('View history', 'हिस्ट्री देखें')} <ArrowRight size={16} /></Link></div><div className="reference-rebook-grid">{repeatBookings.map(booking => { const service = booking.service!; const Icon = serviceMeta[service.slug]?.Icon || Wrench; return <Link key={booking.id} href={`/book/${service.slug}?rebook=${booking.id}`}><Icon size={20} /><span><b>{language === 'hi' ? service.nameHi : service.nameEn}</b><small>{text('Review details and book again', 'जानकारी जाँचकर फिर बुक करें')}</small></span><ArrowRight size={17} /></Link>; })}</div></section>}

    {/* Special Offer Banner */}
    <section className="bg-gradient-to-r from-[#084c3e] to-[#0a6352] text-white rounded-3xl p-6 sm:p-8 mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
      <div>
        <span className="inline-block px-3 py-1 bg-[#f97316] text-white font-black text-[10px] rounded-md tracking-wider uppercase">
          WELCOME50
        </span>
        <h3 className="text-xl sm:text-2xl font-extrabold mt-2">
          {text('₹50 OFF on your first booking', 'अपनी पहली बुकिंग पर ₹50 की छूट')}
        </h3>
        <p className="text-xs text-emerald-100 mt-1">
          {text('Use code WELCOME50 at checkout. Instant discounts with transparent prices.', 'चेकआउट पर WELCOME50 कोड का उपयोग करें।')}
        </p>
      </div>
      <Link
        href={services[0] ? `/book/${services[0].slug}` : '#services-grid'}
        className="btn-orange flex-shrink-0"
      >
        <span>{text('Claim Discount', 'छूट का लाभ लें')}</span>
        <ArrowRight size={16} />
      </Link>
    </section>

    {/* Back to top floating button */}
    {showTop && (
      <button
        type="button"
        className="fixed right-6 bottom-6 z-40 bg-[#084c3e] text-white p-3 rounded-full shadow-xl hover:bg-[#063b31] transition flex items-center gap-1.5 text-xs font-bold"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <ArrowUp size={16} />
        <span>Top</span>
      </button>
    )}
  </div>;
}
