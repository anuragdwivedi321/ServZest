import { MockOtpProvider } from './otp.service';
import { config } from '../config';
describe('Development OTP', () => {
  afterEach(() => { jest.restoreAllMocks(); });
  it('requires a sent code and consumes it after verification', async () => {
    const provider = new MockOtpProvider();
    expect(await provider.verifyOtp('test-phone', '123456')).toBe(false);
    await provider.sendOtp('test-phone');
    expect(await provider.verifyOtp('test-phone', '123456')).toBe(true);
    expect(await provider.verifyOtp('test-phone', '123456')).toBe(false);
  });
  it('expires after ten minutes and locks after five wrong attempts', async () => {
    const provider = new MockOtpProvider();
    await provider.sendOtp('test-phone');
    for (let i = 0; i < 5; i++) expect(await provider.verifyOtp('test-phone', '000000')).toBe(false);
    expect(await provider.verifyOtp('test-phone', '123456')).toBe(false);
    await provider.sendOtp('test-phone');
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 600001);
    expect(await provider.verifyOtp('test-phone', '123456')).toBe(false);
  });
  it('never enables the mock provider in production', async () => {
    const previous = config.nodeEnv;
    try { config.nodeEnv = 'production'; const provider = new MockOtpProvider(); expect((await provider.sendOtp('test-phone')).success).toBe(false); expect(await provider.verifyOtp('test-phone', '123456')).toBe(false); }
    finally { config.nodeEnv = previous; }
  });
});
