'use client';

import dynamic from 'next/dynamic';
import type { LeafletMapProps } from './LeafletMap';

const ClientMap = dynamic(
  () => import('./LeafletMap').then(module => module.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full rounded-2xl border border-slate-200 bg-slate-100 animate-pulse" role="status" aria-label="Loading map" />,
  }
);

export function LeafletMap(props: LeafletMapProps) {
  return <ClientMap {...props} />;
}
