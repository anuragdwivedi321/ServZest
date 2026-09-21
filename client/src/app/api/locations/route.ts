import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const cache = new Map<string, { expires: number; results: unknown[] }>();
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const q = input.get('q')?.trim();
  const reverse = input.get('reverse') === '1';
  const lat = Number(input.get('lat')), lng = Number(input.get('lng'));
  if ((!reverse && (!q || q.length < 3 || q.length > 250)) || (reverse && (!input.has('lat') || !input.has('lng') || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180))) {
    return NextResponse.json({ message: 'Enter at least 3 characters or a valid location.' }, { status: 400 });
  }
  const url = new URL(reverse ? 'reverse' : 'api', (process.env.PHOTON_URL || 'https://photon.komoot.io').replace(/\/$/, '') + '/');
  url.searchParams.set('lang', 'en'); url.searchParams.set('limit', reverse ? '1' : '6');
  if (reverse) { url.searchParams.set('lat', String(lat)); url.searchParams.set('lon', String(lng)); }
  else { url.searchParams.set('q', q!); url.searchParams.set('countrycode', 'IN'); }
  const key = url.toString(); const stored = cache.get(key);
  if (stored && stored.expires > Date.now()) return NextResponse.json({ results: stored.results });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store', headers: { 'User-Agent': 'ServZest-address-search/1.0' } });
    if (!response.ok) throw new Error('Geocoder unavailable');
    const data = await response.json();
    const results = (data.features || []).flatMap((feature: any) => {
      const [lon, latitude] = feature.geometry?.coordinates || [];
      if (!Number.isFinite(lon) || !Number.isFinite(latitude)) return [];
      const p = feature.properties || {};
      const label = Array.from(new Set([p.name, [p.housenumber, p.street].filter(Boolean).join(' '), p.district, p.city || p.county, p.state, p.postcode, p.country].filter(Boolean))).join(', ');
      return label ? [{ label, lat: latitude, lng: lon }] : [];
    });
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 300000, results });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ message: 'Address search is temporarily unavailable. Select a map pin and type your address manually.' }, { status: 503 });
  }
}
