import { dispatchService } from './dispatch.service';

describe('DispatchService', () => {
  describe('calculateEta', () => {
    it('calculates ETA using 1.3 road factor and 25 km/h urban speed', () => {
      // 1000m (1 km straight) -> 1.3 km road -> (1.3 / 25) * 60 = 3.12 mins -> 3 mins
      const result1 = dispatchService.calculateEta(1000);
      expect(result1.roadDistanceKm).toBe(1.3);
      expect(result1.etaMinutes).toBe(3);

      // 3000m (3 km straight) -> 3.9 km road -> (3.9 / 25) * 60 = 9.36 mins -> 9 mins
      const result2 = dispatchService.calculateEta(3000);
      expect(result2.roadDistanceKm).toBe(3.9);
      expect(result2.etaMinutes).toBe(9);

      // 5000m (5 km straight) -> 6.5 km road -> (6.5 / 25) * 60 = 15.6 mins -> 16 mins
      const result3 = dispatchService.calculateEta(5000);
      expect(result3.roadDistanceKm).toBe(6.5);
      expect(result3.etaMinutes).toBe(16);
    });

    it('clamps minimum ETA to 1 minute for very close distances', () => {
      const result = dispatchService.calculateEta(50); // 50 meters
      expect(result.etaMinutes).toBe(1);
    });
  });
});
