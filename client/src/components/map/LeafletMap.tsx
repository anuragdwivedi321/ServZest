'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  customerLocation?: [number, number];
  workerLocation?: [number, number];
  isDraggable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 14,
  customerLocation,
  workerLocation,
  isDraggable = false,
  onLocationChange,
  className = 'h-64 w-full rounded-2xl overflow-hidden shadow-inner',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const workerMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Dynamically import Leaflet to avoid SSR errors
    import('leaflet').then((L) => {
      if (!mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView(center, zoom);

        // Free OpenStreetMap tile layer (No API key needed!)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.setView(center, zoom);
      }

      const map = mapInstanceRef.current;

      // Custom Customer Marker Icon
      const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `<div style="background-color: #ef4444; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; items-center: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">📍</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      // Custom Worker Marker Icon
      const workerIcon = L.divIcon({
        className: 'custom-worker-pin',
        html: `<div style="background-color: #f59e0b; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(245,158,11,0.5); display: flex; align-items: center; justify-content: center; font-size: 16px; animation: pulse 2s infinite;">⚡</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Customer Location Marker
      if (customerLocation) {
        if (!customerMarkerRef.current) {
          const marker = L.marker(customerLocation, {
            icon: customerIcon,
            draggable: isDraggable,
          }).addTo(map);

          if (isDraggable && onLocationChange) {
            marker.on('dragend', (e: any) => {
              const { lat, lng } = e.target.getLatLng();
              onLocationChange(lat, lng);
            });
          }

          customerMarkerRef.current = marker;
        } else {
          customerMarkerRef.current.setLatLng(customerLocation);
        }
      }

      // Worker Location Marker
      if (workerLocation) {
        if (!workerMarkerRef.current) {
          const marker = L.marker(workerLocation, { icon: workerIcon }).addTo(map);
          workerMarkerRef.current = marker;
        } else {
          workerMarkerRef.current.setLatLng(workerLocation);
        }
      } else if (workerMarkerRef.current) {
        map.removeLayer(workerMarkerRef.current);
        workerMarkerRef.current = null;
      }
    });

    return () => {
      // Keep map instance cached or clean up if container destroyed
    };
  }, [center, customerLocation, workerLocation, isDraggable]);

  return <div ref={mapContainerRef} className={className} />;
};
