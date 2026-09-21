'use client';
import { useEffect, useRef, useState } from 'react';
import { LeafletMap } from '../map/LeafletMapDynamic';
type Location = { lat: number; lng: number; address: string; hasPin: boolean; confirmed: boolean };
type Suggestion = { label: string; lat: number; lng: number };
export function LocationPicker({ value, onChange, required }: { value: Location; onChange: (patch: Partial<Location>) => void; required: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [gps, setGps] = useState(false);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(-1);
  const selection = useRef(0);
  const current = useRef(value); current.current = value;
  useEffect(() => {
    if (!open || query.trim().length < 3) { setResults([]); setBusy(false); setSearchMessage(''); return; }
    const controller = new AbortController(); setBusy(true); setResults([]); setActive(-1); setSearchMessage('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.message);
        if (!controller.signal.aborted) { setResults(data.results); setSearchMessage(data.results.length ? '' : 'No matching address. Add your city or area and try Search again, or choose a pin on the map.'); }
      } catch (error: any) { if (!controller.signal.aborted) setSearchMessage('Address search could not load. Tap Search to retry, or choose your location on the map.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open, retry]);
  useEffect(() => () => { selection.current++; }, []);
  const choose = (item: Suggestion) => {
    selection.current++; setQuery(item.label); setOpen(false); setResults([]); setBusy(false); setActive(-1); setSearchMessage('');
    onChange({ lat: item.lat, lng: item.lng, address: item.label, hasPin: true, confirmed: false });
    setMessage('Location selected. Adjust the pin if needed, add your flat/house details below, then confirm.');
  };
  const pickPin = async (lat: number, lng: number) => {
    const version = ++selection.current; setOpen(false); setResults([]);
    onChange({ lat, lng, hasPin: true, confirmed: false });
    setMessage('Pin selected. Looking up the nearby address…');
    const addressBefore = current.current.address;
    try {
      const response = await fetch(`/api/locations?reverse=1&lat=${lat}&lng=${lng}`);
      const data = await response.json();
      if (version !== selection.current) return;
      if (response.ok && data.results?.[0] && current.current.address === addressBefore) {
        onChange({ address: data.results[0].label });
        setMessage('Pin selected and nearby address filled. Add house/flat details and confirm.');
      } else setMessage('Pin selected. Type your full address below and confirm.');
    } catch { if (version === selection.current) setMessage('Pin selected. Type your full address below and confirm.'); }
  };
  const locate = () => {
    if (!navigator.geolocation || !window.isSecureContext) { setMessage('GPS needs HTTPS or localhost. Search your address or select the map pin.'); return; }
    const version = ++selection.current; setGps(true); setMessage('Finding your location…');
    const success = (position: GeolocationPosition) => { setGps(false); if (version === selection.current) void pickPin(position.coords.latitude, position.coords.longitude); };
    const fail = (error: GeolocationPositionError) => { setGps(false); if (version === selection.current) setMessage(error.code === 1 ? 'Location permission blocked. Allow Location in your browser site settings, or select an address below.' : 'GPS could not find your position. Search your address or select a pin on the map.'); };
    navigator.geolocation.getCurrentPosition(success, error => {
      if (error.code !== 1 && version === selection.current) navigator.geolocation.getCurrentPosition(success, fail, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
      else fail(error);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  };
  return <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
    <div className="flex justify-between items-center gap-3"><h2 className="font-bold">Select service location</h2><button type="button" disabled={gps} onClick={locate} className="text-sm text-brand-700 font-bold disabled:opacity-50">{gps ? 'Locating…' : 'Use my location'}</button></div>
    <div className="relative">
      <label htmlFor="location-search" className="block text-sm font-bold mb-2">Search address, area or landmark</label>
      <div className="flex gap-2 items-start"><input id="location-search" role="combobox" aria-autocomplete="list" aria-expanded={open && results.length > 0} aria-controls="address-suggestions" aria-activedescendant={active >= 0 ? `address-option-${active}` : undefined} autoComplete="off" value={query} maxLength={250} placeholder="e.g. Sector 62 Noida" onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setOpen(true); setMessage(''); onChange({ confirmed: false }); }} onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter') { e.preventDefault(); if (open && results[active >= 0 ? active : 0]) choose(results[active >= 0 ? active : 0]); else { setOpen(true); setRetry(n => n + 1); } }
      }} className="w-full min-w-0 px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-brand-500" /><button type="button" disabled={busy || query.trim().length < 3} onClick={() => { setOpen(true); setRetry(n => n + 1); }} className="px-4 py-3 rounded-xl bg-brand-600 text-white font-bold disabled:opacity-50">{busy ? 'Searching…' : 'Search'}</button></div>
      {open && results.length > 0 && <ul id="address-suggestions" role="listbox" className="mt-2 w-full bg-white border border-brand-200 rounded-xl shadow-sm max-h-64 overflow-auto">{results.map((item, i) => <li key={`${item.lat},${item.lng},${i}`} id={`address-option-${i}`} role="option" aria-selected={active === i}><button type="button" onClick={() => choose(item)} onMouseEnter={() => setActive(i)} className={`w-full text-left p-3 text-sm border-b ${active === i ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>{item.label}</button></li>)}</ul>}
      {busy && <p role="status" className="text-xs text-slate-500 mt-2">Searching addresses…</p>}
      {searchMessage && <p role="status" className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3 mt-2">{searchMessage}</p>}
      {query.trim().length < 3 && <p className="text-xs text-slate-500 mt-2">Type at least 3 letters, then choose an address from the results.</p>}
      <p className="text-xs text-slate-400 mt-2">Address search: Photon / OpenStreetMap</p>
    </div>
    <p className="text-xs text-slate-500">Choose a suggestion, tap the map, drag the pin, or move the map and use its centre.</p>
    <LeafletMap center={[value.lat, value.lng]} customerLocation={[value.lat, value.lng]} isDraggable onLocationChange={pickPin} className="h-72 sm:h-80 w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0" />
    <p role="status" className={`text-sm ${value.hasPin ? 'text-brand-700' : 'text-slate-600'}`}>{message || (value.hasPin ? 'Location selected.' : 'Please select your service location.')}</p>
    {value.hasPin && <p className="text-xs text-slate-500">Selected pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</p>}
    <label className="block text-sm font-bold">Full address / house / flat details<textarea required={required} minLength={8} maxLength={500} rows={3} value={value.address} onChange={e => { selection.current++; onChange({ address: e.target.value, confirmed: false }); }} placeholder="Select a location above, then add house/flat number and landmark" className="mt-2 w-full border rounded-xl p-3 font-normal" /></label>
    <label className="flex items-start gap-3 text-sm bg-slate-50 p-3 rounded-xl"><input type="checkbox" required={required} disabled={!value.hasPin || value.address.trim().length < 8} checked={value.confirmed} onChange={e => onChange({ confirmed: e.target.checked })} className="mt-1 accent-teal-600" /><span>The pin and full address point to my service location.</span></label>
  </section>;
}
