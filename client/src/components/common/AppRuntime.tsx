'use client';

import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';

export function AppRuntime() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('[PWA] Service worker registration failed:', error);
      });
    }

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="network-banner" role="status" aria-live="polite">
      <CloudOff size={17} aria-hidden="true" />
      <span>You’re offline. Live bookings and location updates will resume when your connection returns.</span>
      <button type="button" onClick={() => window.location.reload()}>
        <RefreshCw size={14} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
