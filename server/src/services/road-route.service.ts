export type RoadRoute = { points: [number, number][]; distanceMeters: number; durationSeconds: number; calculatedAt: string };
const cache = new Map<string, { until: number; result: Promise<RoadRoute | null> }>();
export async function getRoadRoute(from: [number, number], to: [number, number]): Promise<RoadRoute | null> {
  const key = [...from, ...to].map(n => n.toFixed(4)).join(',');
  const existing = cache.get(key);
  if (existing && existing.until > Date.now()) return existing.result;
  const result = (async () => {
    try {
      const base = process.env.OSRM_URL || 'https://router.project-osrm.org';
      const url = `${base.replace(/\/$/, '')}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false&radiuses=200;200`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const data = await response.json() as any;
      const route = data.routes?.[0];
      if (data.code !== 'Ok' || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration) || route.distance < 0 || route.duration < 0) return null;
      const coords = route.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2 || coords.some(p => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) return null;
      return { points: coords.map(p => [p[1], p[0]] as [number, number]), distanceMeters: route.distance, durationSeconds: route.duration, calculatedAt: new Date().toISOString() };
    } catch { return null; }
  })();
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 30000, result });
  return result;
}
