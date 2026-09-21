import { config } from '../config';

export interface IOtpProvider {
  sendOtp(phone: string): Promise<{ success: boolean; message: string }>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}

export class MockOtpProvider implements IOtpProvider {
  private validCodes = new Map<string, { code: string; expires: number; attempts: number }>();

  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    if (config.nodeEnv === 'production') return { success: false, message: 'SMS provider is not configured. Contact support.' };
    const code = config.mockOtp;
    for (const [key, entry] of this.validCodes) if (entry.expires < Date.now()) this.validCodes.delete(key);
    this.validCodes.set(phone, { code, expires: Date.now() + 600000, attempts: 0 });
    console.log('[MockOtpProvider] Development OTP challenge created');
    return {
      success: true,
      message: `Your ServZest verification OTP is ${code}. Valid for 10 minutes. (Dev mock code: ${code})`,
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const stored = this.validCodes.get(phone);
    if (config.nodeEnv === 'production' || !stored || stored.expires < Date.now() || stored.attempts >= 5) return false;
    stored.attempts++;
    if (stored.code === otp) {
      this.validCodes.delete(phone);
      return true;
    }
    return false;
  }
}

export class Msg91OtpProvider implements IOtpProvider {
  private async call(path: string, method: 'GET' | 'POST' = 'GET') {
    const response = await fetch(`https://control.msg91.com/api/v5/otp${path}`, {
      method,
      headers: { accept: 'application/json', authkey: config.otp.msg91AuthKey },
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({})) as { type?: string; message?: string };
    return { ok: response.ok && payload.type !== 'error', payload };
  }

  async sendOtp(phone: string) {
    const query = new URLSearchParams({ template_id: config.otp.msg91TemplateId, mobile: `91${phone}` });
    const result = await this.call(`?${query.toString()}`, 'POST');
    return result.ok
      ? { success: true, message: 'OTP sent securely to your mobile number.' }
      : { success: false, message: 'OTP could not be sent. Please wait and retry.' };
  }

  async verifyOtp(phone: string, otp: string) {
    const query = new URLSearchParams({ otp, mobile: `91${phone}` });
    const result = await this.call(`/verify?${query.toString()}`);
    return result.ok && /verified|success/i.test(result.payload.message || result.payload.type || '');
  }
}

// Pluggable factory/singleton
export const otpProvider: IOtpProvider = config.otp.provider === 'msg91' ? new Msg91OtpProvider() : new MockOtpProvider();
