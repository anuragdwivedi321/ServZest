import { DispatchService, CandidateWorker } from './dispatch.service';
import { settingsService } from './settings.service';

const worker = { id: 'worker', userId: 'user', name: 'Test', phone: 'test', rating: 5, lat: 0, lng: 0, straightDistanceMeters: 0, roadDistanceKm: 0, etaMinutes: 1 } as CandidateWorker;
describe('Dispatch concurrency and recovery', () => {
  let service: DispatchService;
  const callbacks = () => ({ onWorkerRequested: jest.fn(), onDispatchExhausted: jest.fn(), onWorkerAssigned: jest.fn() });
  beforeEach(() => { service = new DispatchService(); jest.spyOn(settingsService, 'getSetting').mockResolvedValue(30); });
  afterEach(() => { service.cancelDispatch('booking'); jest.restoreAllMocks(); });
  it('deduplicates concurrent dispatch while the candidate query is pending', async () => {
    let resolve!: (value: CandidateWorker[]) => void;
    const lookup = jest.spyOn(service, 'findNearbyWorkers').mockImplementation(() => new Promise(r => { resolve = r; }));
    const events = callbacks();
    const first = service.startDispatch('booking', 'service', 0, 0, events);
    await service.startDispatch('booking', 'service', 0, 0, events);
    resolve([worker]); await first;
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(events.onWorkerRequested).toHaveBeenCalledTimes(1);
  });
  it('does not send an offer after cancellation during candidate lookup', async () => {
    let resolve!: (value: CandidateWorker[]) => void;
    jest.spyOn(service, 'findNearbyWorkers').mockImplementation(() => new Promise(r => { resolve = r; }));
    const events = callbacks(); const run = service.startDispatch('booking', 'service', 0, 0, events);
    service.cancelDispatch('booking'); resolve([worker]); await run;
    expect(events.onWorkerRequested).not.toHaveBeenCalled();
    expect(events.onDispatchExhausted).not.toHaveBeenCalled();
    expect(service.hasSession('booking')).toBe(false);
  });
  it('allows retry after database failure without reporting no provider', async () => {
    jest.spyOn(service, 'findNearbyWorkers').mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValueOnce([worker]);
    const events = callbacks();
    await expect(service.startDispatch('booking', 'service', 0, 0, events)).rejects.toThrow('Database unavailable');
    expect(events.onDispatchExhausted).not.toHaveBeenCalled();
    expect(service.hasSession('booking')).toBe(false);
    await service.startDispatch('booking', 'service', 0, 0, events);
    expect(events.onWorkerRequested).toHaveBeenCalledTimes(1);
  });
  it('does not resurrect a cancelled offer while loading timeout settings', async () => {
    let resolve!: (value: number) => void;
    jest.spyOn(service, 'findNearbyWorkers').mockResolvedValue([worker]);
    (settingsService.getSetting as jest.Mock).mockImplementation(() => new Promise(r => { resolve = r; }));
    const events = callbacks(); const run = service.startDispatch('booking', 'service', 0, 0, events);
    await Promise.resolve(); service.cancelDispatch('booking'); resolve(30); await run;
    expect(events.onWorkerRequested).not.toHaveBeenCalled();
  });
  it('marks an actual empty search exhausted', async () => {
    jest.spyOn(service, 'findNearbyWorkers').mockResolvedValue([]);
    const events = callbacks(); await service.startDispatch('booking', 'service', 0, 0, events);
    expect(events.onDispatchExhausted).toHaveBeenCalledTimes(1);
    expect(service.hasSession('booking')).toBe(false);
  });
});
