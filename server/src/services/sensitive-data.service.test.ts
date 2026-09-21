import { protectSensitive, revealSensitive } from './sensitive-data.service';

describe('sensitive identity storage', () => {
  it('encrypts Aadhaar values and can recover them server-side', () => {
    const aadhaar = '123456789012';
    const protectedValue = protectSensitive(aadhaar);

    expect(protectedValue).toMatch(/^enc:v1:/);
    expect(protectedValue).not.toContain(aadhaar);
    expect(revealSensitive(protectedValue)).toBe(aadhaar);
  });

  it('keeps legacy plaintext readable until it is resubmitted', () => {
    expect(revealSensitive('123456789012')).toBe('123456789012');
  });
});
