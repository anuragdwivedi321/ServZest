'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { AirVent, ArrowRight, ArrowUp, BadgeCheck, Bike, Clock3, HardHat, Headphones, LocateFixed, MapPin, Mic, Search, ShieldCheck, Sparkles, Star, Wrench, X, Zap } from 'lucide-react';
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
type LocationSuggestion = { label: string; lat: number; lng: number };

const serviceMeta: Record<string, { Icon: LucideIcon; description: string; hindi: string }> = {
  electrician: { Icon: Zap, description: 'Switches, wiring & appliance fixes', hindi: 'वायरिंग, स्विच और उपकरण' },
  plumber: { Icon: Wrench, description: 'Leaks, taps & water fittings', hindi: 'लीकेज, नल और फिटिंग' },
  ac: { Icon: AirVent, description: 'Service, cooling & installation', hindi: 'सर्विस, कूलिंग और इंस्टॉलेशन' },
  majdoor: { Icon: HardHat, description: 'Moving, loading & skilled help', hindi: 'शिफ्टिंग और घरेलू सहायता' },
  mechanic: { Icon: Bike, description: 'Puncture, battery & roadside help', hindi: 'पंचर और रोडसाइड सहायता' },
};
const rotatingSearches = ['Plumber', 'Electrician', 'AC repair', 'Mechanic', 'Home helper'];
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
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [showTop, setShowTop] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

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
    const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % heroStories.length), 5200);
    return () => window.clearInterval(timer);
  }, [heroPaused]);
  useEffect(() => {
    if (authLoading || user?.role !== 'CUSTOMER') return;
    api.getMyBookings().then(result => { if (result.success) setBookings(result.bookings || []); }).catch(() => undefined);
  }, [authLoading, user]);
  useEffect(() => {
    if (!locationOpen || locationQuery.trim().length < 3) {
      setLocationResults([]);
      setLocationBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationBusy(true);
      setLocationMessage('');
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(locationQuery.trim())}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setLocationResults(result.results || []);
        if (!result.results?.length) setLocationMessage(text('No matching area found. Add your city or landmark.', 'लोकेशन नहीं मिली। शहर या लैंडमार्क भी लिखें।'));
      } catch {
        if (!controller.signal.aborted) setLocationMessage(text('Location search is unavailable. Try GPS.', 'लोकेशन सर्च उपलब्ध नहीं है। GPS आज़माएँ।'));
      } finally { if (!controller.signal.aborted) setLocationBusy(false); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locationOpen, locationQuery, language]);

  const saveLocation = (next: LocationSuggestion) => {
    setLocation(next);
    setLocationQuery(next.label);
    setLocationOpen(false);
    setLocationResults([]);
    setLocationMessage('');
    try { localStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  };
  const locateMe = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationMessage(text('GPS needs HTTPS or localhost. Search your area instead.', 'GPS के लिए HTTPS या localhost चाहिए। अपना एरिया खोजें।'));
      return;
    }
    setLocationBusy(true);
    setLocationMessage(text('Finding your location…', 'आपकी लोकेशन खोज रहे हैं…'));
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const { latitude: lat, longitude: lng } = position.coords;
        const response = await fetch(`/api/locations?reverse=1&lat=${lat}&lng=${lng}`);
        const result = await response.json();
        saveLocation(result.results?.[0] || { label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
      } catch {
        setLocationMessage(text('Address lookup failed. Search your area manually.', 'पता नहीं मिला। अपना एरिया खोजें।'));
      } finally { setLocationBusy(false); }
    }, geoError => {
      setLocationBusy(false);
      setLocationMessage(geoError.code === 1
        ? text('Location permission is blocked. Allow it in browser settings.', 'लोकेशन अनुमति बंद है। ब्राउज़र सेटिंग में अनुमति दें।')
        : text('GPS could not find you. Search your area.', 'GPS लोकेशन नहीं मिली। अपना एरिया खोजें।'));
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
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

  return <div className="rapid-home">
    <section className="rapid-arrival-bar" aria-label="Service speed and location">
      <div className="rapid-eta"><span><Zap size={14} fill="currentColor" /> {text('ARRIVAL TARGET', 'आने का लक्ष्य')}</span><strong>{text('Professional in ~20 min', 'प्रोफेशनल लगभग 20 मिनट में')}</strong><small>{text('Subject to nearby availability & traffic', 'नज़दीकी उपलब्धता और ट्रैफिक पर निर्भर')}</small></div>
      <div className="rapid-location-wrap">
        <button type="button" className="rapid-location-button" onClick={() => setLocationOpen(open => !open)} aria-expanded={locationOpen}><span className="rapid-location-icon"><MapPin size={19} /></span><span><small>{text('SERVICE LOCATION', 'सेवा की लोकेशन')}</small><strong>{location?.label || text('Select your area', 'अपना एरिया चुनें')}</strong></span><ArrowRight size={17} /></button>
        {locationOpen && <div className="rapid-location-panel"><div className="rapid-location-search"><Search size={17} /><input autoFocus value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder={text('Search area, address or landmark', 'एरिया, पता या लैंडमार्क खोजें')} /><button type="button" onClick={() => { setLocationQuery(''); setLocationResults([]); }} aria-label="Clear location"><X size={16} /></button></div><button type="button" className="rapid-use-location" onClick={locateMe} disabled={locationBusy}><LocateFixed size={17} />{locationBusy ? text('Locating…', 'खोज रहे हैं…') : text('Use my current location', 'मेरी मौजूदा लोकेशन')}</button>{locationResults.length > 0 && <div className="rapid-location-results">{locationResults.map(item => <button type="button" key={`${item.lat}-${item.lng}`} onClick={() => saveLocation(item)}><MapPin size={15} /><span>{item.label}</span></button>)}</div>}{locationMessage && <p role="status" className="rapid-location-message">{locationMessage}</p>}{locationQuery.trim().length > 0 && locationQuery.trim().length < 3 && <p className="rapid-location-message">{text('Type at least 3 letters.', 'कम से कम 3 अक्षर लिखें।')}</p>}</div>}
      </div>
    </section>

    <section className="rapid-hero">
      <div className="rapid-hero-copy"><span className="rapid-kicker"><Sparkles size={15} /> {text('HOME HELP, WITHOUT THE WAIT', 'घर की मदद, बिना इंतज़ार')}</span><h1>{text('Your home,', 'आपका घर,')}<br/><em>{text('sorted in minutes.', 'मिनटों में तैयार।')}</em></h1><p>{text('Verified local professionals for repairs, maintenance and everyday help—with clear pricing and live tracking.', 'मरम्मत और रोज़मर्रा की मदद के लिए सत्यापित नज़दीकी प्रोफेशनल—स्पष्ट कीमत और लाइव ट्रैकिंग के साथ।')}</p><div className="rapid-proof"><span><ShieldCheck size={16} />{text('Verified partners', 'सत्यापित पार्टनर')}</span><span><Clock3 size={16} />{text('20-min target', '20 मिनट लक्ष्य')}</span><span><BadgeCheck size={16} />{text('Approval-first billing', 'पहले मंज़ूरी')}</span></div></div>
      <div className="rapid-hero-visual rapid-story-carousel" role="region" aria-roledescription="carousel" aria-label={text('Professionals at work', 'काम करते प्रोफेशनल')} onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onFocusCapture={() => setHeroPaused(true)} onBlurCapture={() => setHeroPaused(false)}>
        <div className="rapid-story-media">{heroStories.map((story, index) => <Image key={story.slug} src={story.image} alt={index === heroIndex ? (language === 'hi' ? story.titleHi : story.titleEn) : ''} aria-hidden={index !== heroIndex} fill priority={index === 0} sizes="(max-width: 767px) 100vw, 44vw" className={index === heroIndex ? 'is-active' : ''} />)}</div>
        <div className="rapid-story-shade" />
        <div className="rapid-story-status"><span className="online-dot" />{text('Verified professional', 'सत्यापित प्रोफेशनल')}<b>~20 min</b></div>
        {heroStories.map((story, index) => { const Icon = story.Icon; return <div key={story.slug} className={`rapid-story-copy ${index === heroIndex ? 'is-active' : ''}`} aria-hidden={index !== heroIndex}><span><Icon size={19} /></span><div><small>{text('SERVZEST AT WORK', 'SERVZEST काम पर')}</small><strong>{language === 'hi' ? story.titleHi : story.titleEn}</strong><p>{language === 'hi' ? story.copyHi : story.copyEn}</p></div><Link href={`/book/${story.slug}`} tabIndex={index === heroIndex ? 0 : -1} aria-label={text(`Book ${story.titleEn}`, `${story.titleHi} बुक करें`)}><ArrowRight size={18} /></Link></div>; })}
        <div className="rapid-story-dots" aria-label={text('Choose a service story', 'सेवा की तस्वीर चुनें')}>{heroStories.map((story, index) => <button type="button" key={story.slug} className={index === heroIndex ? 'is-active' : ''} onClick={() => setHeroIndex(index)} aria-label={text(`Show ${story.titleEn}`, `${story.titleHi} दिखाएँ`)} aria-current={index === heroIndex ? 'true' : undefined} />)}</div>
      </div>
    </section>

    <section className="rapid-smart-search" aria-label="Search services"><Search size={22} /><input aria-label="Search services" value={query} onChange={event => { setQuery(event.target.value); setSearchMessage(''); }} onKeyDown={event => { if (event.key === 'Enter') submitSearch(); }} placeholder={text(`Search “${rotatingSearches[searchIndex]}”`, `“${rotatingSearches[searchIndex]}” खोजें`)} /><button type="button" onClick={startVoiceSearch} className={listening ? 'is-listening' : ''} aria-label="Search by voice"><Mic size={21} /></button>{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={20} /></button>}</section>
    {searchMessage && <p className="rapid-search-message" role="status">{searchMessage}</p>}
    {query && <div className="rapid-suggestions">{filtered.slice(0, 5).map(service => { const Icon = serviceMeta[service.slug]?.Icon || Wrench; return <Link href={`/book/${service.slug}`} key={service.id}><Icon size={18} /><span><b>{language === 'hi' ? service.nameHi : service.nameEn}</b><small>{serviceMeta[service.slug]?.description}</small></span><ArrowRight size={16} /></Link>; })}{!filtered.length && <p>{text('No exact match. Try plumber, electrician or AC.', 'सेवा नहीं मिली। प्लंबर, इलेक्ट्रीशियन या AC खोजें।')}</p>}</div>}
    <div className="rapid-search-chips" aria-label="Popular searches"><span>{text('Popular:', 'लोकप्रिय:')}</span>{['AC repair', 'Plumber', 'Electrician', 'Puncture'].map(term => <button type="button" key={term} onClick={() => { setQuery(term); window.setTimeout(() => document.getElementById('quick-book')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>{term}</button>)}</div>

    <section id="services-grid" className="rapid-section rapid-categories"><div className="rapid-section-head"><div><span>{text('SERVICES', 'सेवाएँ')}</span><h2>{text('What do you need help with?', 'आज किस काम में मदद चाहिए?')}</h2></div><small>{text('Tap to see transparent rates', 'स्पष्ट कीमत देखने के लिए चुनें')}</small></div>{loading && <div className="rapid-category-grid" aria-label="Loading services">{Array.from({ length: 5 }, (_, index) => <div className="rapid-category-skeleton" key={index} />)}</div>}{error && <div className="rapid-state" role="alert"><p>{error}</p><button onClick={load}>{text('Try again', 'दोबारा कोशिश करें')}</button></div>}{!loading && !error && <div className="rapid-category-grid">{services.map((service, index) => { const Icon = serviceMeta[service.slug]?.Icon || Wrench; return <Link href={`/book/${service.slug}`} key={service.id} className={`rapid-category rapid-category-${(index % 5) + 1}`}><span><Icon size={27} /></span><b>{language === 'hi' ? service.nameHi : service.nameEn}</b><small>{text(serviceMeta[service.slug]?.description || 'Home service', serviceMeta[service.slug]?.hindi || 'घरेलू सेवा')}</small></Link>; })}</div>}</section>

    <section className="rapid-offer"><div><span className="rapid-offer-tag">WELCOME50</span><h2>{text('₹50 off your first booking', 'पहली बुकिंग पर ₹50 की बचत')}</h2><p>{text('Use the code at checkout. Final price stays in your control.', 'चेकआउट पर कोड लगाएँ। अंतिम कीमत आपकी मंज़ूरी से तय होगी।')}</p></div><Link href={services[0] ? `/book/${services[0].slug}` : '#services-grid'}>{text('Explore services', 'सेवाएँ देखें')}<ArrowRight size={18} /></Link><div className="rapid-offer-shape" aria-hidden="true"><Sparkles size={40} /></div></section>

    <section className="rapid-campaign-section"><div className="rapid-section-head"><div><span>{text('MADE FOR RIGHT NOW', 'आज की ज़रूरत')}</span><h2>{text('Popular around your home', 'आपके घर के आसपास लोकप्रिय')}</h2></div><small>{text('Swipe to explore', 'देखने के लिए स्वाइप करें')}</small></div><div className="rapid-campaign-row">
      {[{ slug: 'ac', Icon: AirVent, eyebrow: text('SEASON READY', 'मौसम के लिए तैयार'), title: text('Fresh cooling, without the wait', 'बिना इंतज़ार बेहतर कूलिंग'), copy: text('AC diagnosis and service from ₹199', 'AC जाँच और सर्विस ₹199 से'), action: text('Book AC care', 'AC सेवा बुक करें'), tone: 'mint' }, { slug: 'plumber', Icon: Wrench, eyebrow: text('QUICK FIX', 'तुरंत मरम्मत'), title: text('Stop leaks before they spread', 'लीकेज को तुरंत रोकें'), copy: text('Taps, pipes and fittings at home', 'नल, पाइप और फिटिंग की सेवा'), action: text('Find a plumber', 'प्लंबर बुलाएँ'), tone: 'blue' }, { slug: 'electrician', Icon: Zap, eyebrow: text('SAFE HOME', 'सुरक्षित घर'), title: text('Power problems, sorted safely', 'बिजली की समस्या सुरक्षित तरीके से'), copy: text('Switch, fan and wiring assistance', 'स्विच, पंखा और वायरिंग सहायता'), action: text('Book electrician', 'इलेक्ट्रीशियन बुक करें'), tone: 'yellow' }, { slug: 'mechanic', Icon: Bike, eyebrow: text('ROADSIDE HELP', 'रोडसाइड मदद'), title: text('Stuck outside? Help is nearby', 'रास्ते में फँसे? मदद नज़दीक है'), copy: text('Puncture, jump-start and towing', 'पंचर, जंप-स्टार्ट और टोइंग'), action: text('Get roadside help', 'रोडसाइड मदद लें'), tone: 'coral' }].map(({ slug, Icon, eyebrow, title, copy, action, tone }) => <Link href={`/book/${slug}`} key={slug} className={`rapid-campaign rapid-campaign-${tone}`}><div><span>{eyebrow}</span><h3>{title}</h3><p>{copy}</p><b>{action}<ArrowRight size={15} /></b></div><span className="rapid-campaign-art"><Icon size={43} /></span></Link>)}
    </div></section>

    {repeatBookings.length > 0 && <section className="rapid-section"><div className="rapid-section-head"><div><span>{text('YOUR FAVOURITES', 'आपकी पसंद')}</span><h2>{text('Book again', 'फिर से बुक करें')}</h2></div><Link href="/history">{text('View history', 'हिस्ट्री देखें')}<ArrowRight size={15} /></Link></div><div className="rapid-rebook-row">{repeatBookings.map(booking => { const service = booking.service!; const Icon = serviceMeta[service.slug]?.Icon || Wrench; return <article key={booking.id}><span className="rapid-rebook-icon"><Icon size={22} /></span><div><b>{language === 'hi' ? service.nameHi : service.nameEn}</b><small>{booking.worker?.user?.name || text('Verified professional', 'सत्यापित प्रोफेशनल')}</small></div><Link href={`/book/${service.slug}?rebook=${booking.id}`}>{text('Book again', 'फिर बुक करें')}</Link></article>; })}</div></section>}

    <section id="quick-book" className="rapid-section rapid-quick"><div className="rapid-section-head"><div><span>{text('AVAILABLE SERVICES', 'उपलब्ध सेवाएँ')}</span><h2>{text(query ? `Results for “${query}”` : 'Quick book near you', query ? `“${query}” के परिणाम` : 'नज़दीकी सेवा तुरंत बुक करें')}</h2></div><small>{text('Live availability can change', 'उपलब्धता बदल सकती है')}</small></div>{!loading && !error && <div className="rapid-service-grid">{filtered.map(service => { const meta = serviceMeta[service.slug]; const Icon = meta?.Icon || Wrench; const market = service.market; return <article key={service.id} className="rapid-service-card"><div className="rapid-service-card-top"><span className="rapid-service-icon"><Icon size={27} /></span>{market && market.onlineWorkers > 0 ? <span className="rapid-live"><i />{market.onlineWorkers} {text('online', 'ऑनलाइन')}</span> : <span className="rapid-neutral">{text('Check availability', 'उपलब्धता देखें')}</span>}</div><h3>{language === 'hi' ? service.nameHi : service.nameEn}</h3><p>{text(meta?.description || 'Trusted help for your home', meta?.hindi || 'आपके घर के लिए भरोसेमंद मदद')}</p><div className="rapid-service-badges"><span><Clock3 size={13} />~20 min target</span>{market?.averageRating ? <span><Star size={13} fill="currentColor" />{market.averageRating.toFixed(1)} ({market.reviewCount})</span> : <span><BadgeCheck size={13} />Verified</span>}</div><div className="rapid-service-footer"><span><small>{text('Visit from', 'विज़िट शुल्क')}</small><b>₹{Number(service.visitCharge).toLocaleString('en-IN')}</b></span><Link href={`/book/${service.slug}`}>{text('Book', 'बुक करें')}<ArrowRight size={15} /></Link></div></article>; })}</div>}{!loading && !error && !filtered.length && <div className="rapid-state"><p>{text('No matching service found.', 'मिलती हुई सेवा नहीं मिली।')}</p><button onClick={() => setQuery('')}>{text('Show all services', 'सभी सेवाएँ देखें')}</button></div>}</section>

    <section className="rapid-assurance"><div><ShieldCheck size={24} /><span><b>{text('Your approval comes first', 'आपकी मंज़ूरी सबसे पहले')}</b><small>{text('Extra work and parts are added only after you approve them.', 'अतिरिक्त काम और पार्ट्स आपकी मंज़ूरी के बाद ही जुड़ेंगे।')}</small></span></div><div><Headphones size={24} /><span><b>{text('Support through every booking', 'हर बुकिंग में सहायता')}</b><small>{text('Track, pay, rate or report an issue from one place.', 'एक ही जगह ट्रैक, भुगतान, रेटिंग या शिकायत करें।')}</small></span></div><Link href="/contact">{text('Get help', 'मदद लें')}<ArrowRight size={16} /></Link></section>
    <section className="rapid-partner"><div><span>{text('SERVZEST PARTNER', 'SERVZEST पार्टनर')}</span><h2>{text('Turn your skill into steady work.', 'अपने हुनर को नियमित काम में बदलें।')}</h2><p>{text('Verified professionals can receive nearby jobs, manage earnings and build their reputation.', 'सत्यापित प्रोफेशनल नज़दीकी काम, कमाई और अपनी रेटिंग मैनेज कर सकते हैं।')}</p></div><Link href="/login?role=WORKER">{text('Join as a professional', 'प्रोफेशनल के रूप में जुड़ें')}<ArrowRight size={17} /></Link></section>
    {showTop && <button type="button" className="rapid-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp size={17} /><span>{text('Top', 'ऊपर')}</span></button>}
  </div>;
}
