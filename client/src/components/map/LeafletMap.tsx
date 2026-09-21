'use client';
import { LocateFixed } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Map, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LeafletMapProps {
  center: [number, number]; zoom?: number; customerLocation?: [number, number];
  workerLocation?: [number, number]; isDraggable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void; className?: string;
  markers?: { id: string; lat: number; lng: number; label: string }[];
  routePoints?: [number, number][];
}
export function LeafletMap({ center, zoom = 14, customerLocation, workerLocation, markers, routePoints, isDraggable = false, onLocationChange, className = 'h-64 w-full rounded-2xl overflow-hidden' }: LeafletMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const customer = useRef<Marker | null>(null);
  const worker = useRef<Marker | null>(null);
  const callback = useRef(onLocationChange);
  callback.current = onLocationChange;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState('');
  const routeFitted = useRef(false);
  useEffect(() => {
    if (!ready || !map.current || !routePoints?.length) { routeFitted.current = false; return; }
    const instance = map.current; let cancelled = false; let line: import('leaflet').Polyline | undefined; let outline: import('leaflet').Polyline | undefined;
    outline = L.polyline(routePoints, { color: '#ffffff', weight: 10, opacity: 1, interactive: false }).addTo(instance);
    line = L.polyline(routePoints, { color: '#0798ee', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(instance);
    if (!routeFitted.current) { instance.fitBounds(line.getBounds(), { padding: [35, 35], maxZoom: 16 }); routeFitted.current = true; }
    return () => { cancelled = true; line?.remove(); outline?.remove(); };
  }, [ready, routePoints]);
  useEffect(() => {
    if (!ready || !map.current || !markers) return;
    const instance = map.current; let cancelled = false; const added: Marker[] = [];
    customer.current?.remove();
    for (const point of markers) {
      const label = document.createElement('span'); label.textContent = point.label;
      const icon = L.divIcon({ className: '', html: '<div style="background:#0d9488;border:2px solid white;border-radius:50%;width:20px;height:20px"></div>', iconSize: [20,20] });
      added.push(L.marker([point.lat, point.lng], { icon }).bindPopup(label).addTo(instance));
    }
    return () => { cancelled = true; added.forEach(marker => marker.remove()); };
  }, [ready, markers]);
  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    let fallbackResize: (() => void) | undefined;
    try {
      if (!container.current) return;
      const instance = L.map(container.current, { zoomControl: false }).setView(center, zoom);
      map.current = instance;
      L.control.zoom({ position: 'bottomleft' }).addTo(instance);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(instance);
      const homeIcon = L.divIcon({ className: 'sz-marker', html: '<div class="sz-destination"><span></span></div>', iconSize: [36, 46], iconAnchor: [18, 44] });
      const proIcon = L.divIcon({ className: 'sz-marker', html: '<div class="sz-professional"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3z"/></svg></div>', iconSize: [44, 44], iconAnchor: [22, 22] });
      customer.current = L.marker(customerLocation || center, { icon: homeIcon, draggable: isDraggable, title: 'Service location', alt: 'Service location' }).bindTooltip('Service location', { direction: 'top', offset: [0, -40], className: 'sz-map-label' }).addTo(instance);
      worker.current = L.marker(center, { icon: proIcon, title: 'Your professional', alt: 'Your professional' }).bindTooltip('Your professional', { direction: 'top', offset: [0, -22], className: 'sz-map-label' });
      customer.current.on('dragend', () => { const point = customer.current!.getLatLng(); callback.current?.(point.lat, point.lng); });
      if (isDraggable) customer.current.on('click', () => { const point = customer.current!.getLatLng(); callback.current?.(point.lat, point.lng); });
      if (isDraggable) instance.on('click', e => { customer.current?.setLatLng(e.latlng); callback.current?.(e.latlng.lat, e.latlng.lng); });
      if (typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(() => instance.invalidateSize());
        resize.observe(container.current);
      } else {
        fallbackResize = () => instance.invalidateSize();
        window.addEventListener('resize', fallbackResize);
      }
      setReady(true);
    } catch (error) {
      console.error('[Map] Failed to initialize:', error);
      if (!cancelled) setFailed(error instanceof Error ? error.message : 'Map initialization failed');
    }
    return () => { cancelled = true; resize?.disconnect(); if (fallbackResize) window.removeEventListener('resize', fallbackResize); map.current?.remove(); map.current = null; customer.current = null; worker.current = null; };
    // Each map is initialized once; coordinate changes use the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraggable]);
  useEffect(() => { if (ready) map.current?.panTo(center); }, [ready, center[0], center[1]]);
  useEffect(() => { if (ready && customerLocation) customer.current?.setLatLng(customerLocation); }, [ready, customerLocation?.[0], customerLocation?.[1]]);
  useEffect(() => {
    if (!ready || !worker.current || !map.current) return;
    if (workerLocation) worker.current.setLatLng(workerLocation).addTo(map.current);
    else worker.current.remove();
  }, [ready, workerLocation?.[0], workerLocation?.[1]]);
  return <div className="relative isolate z-0 sz-map"><div ref={container} className={className + ' sz-map-surface'} aria-label="Service location map" /><button type="button" className="sz-map-recenter" aria-label="Show service location and professional" title="Recenter map" disabled={!ready} onClick={() => { const instance = map.current; if (!instance) return; const destination = customer.current?.getLatLng(); if (destination && workerLocation) instance.fitBounds([[destination.lat, destination.lng], workerLocation], { padding: [55,55], maxZoom: 16 }); else if (destination) instance.setView(destination, zoom); }}><LocateFixed size={22}/></button>{isDraggable && <button type="button" disabled={!ready} onClick={() => { const point = map.current?.getCenter(); if (point) { customer.current?.setLatLng(point); callback.current?.(point.lat, point.lng); } }} className="mt-2 w-full border border-brand-200 bg-brand-50 text-brand-800 rounded-xl p-3 text-sm font-bold">Use map centre as my location</button>}{failed && <p role="alert" className="text-red-600 text-sm p-2">Map could not load. Please reload the page.{process.env.NODE_ENV === 'development' ? ` (${failed})` : ''}</p>}</div>;
}
