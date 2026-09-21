import { getRoadRoute } from './road-route.service';
describe('Road route', () => {
  afterEach(() => jest.restoreAllMocks());
  it('converts GeoJSON coordinates and deduplicates simultaneous provider requests', async () => {
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 1250, duration: 240, geometry: { coordinates: [[77.2, 28.6], [77.3, 28.7]] } }] }) } as Response);
    const [a, b] = await Promise.all([getRoadRoute([28.6, 77.2], [28.7, 77.3]), getRoadRoute([28.6, 77.2], [28.7, 77.3])]);
    expect(a?.points).toEqual([[28.6, 77.2], [28.7, 77.3]]);
    expect(a?.distanceMeters).toBe(1250); expect(a?.durationSeconds).toBe(240);
    expect(b).toEqual(a); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('returns no route on a timeout instead of inventing a road distance', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    expect(await getRoadRoute([28.61, 77.2], [28.7, 77.3])).toBeNull();
  });
  it('rejects invalid provider geometry', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 10, duration: 10, geometry: { coordinates: [[200, 28], [77, 28]] } }] }) } as Response);
    expect(await getRoadRoute([28.62, 77.2], [28.7, 77.3])).toBeNull();
  });
});
