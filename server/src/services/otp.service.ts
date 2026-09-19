import { config } from '../config';

export interface IOtpProvider {
  sendOtp(phone: string): Promise<{ success: boolean; message: string }>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}

export class MockOtpProvider implements IOtpProvider {
  private validCodes: Map<string, string> = new Map();

  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // In dev / mock mode, standard OTP is 123456
    const code = config.mockOtp;
    this.validCodes.set(phone, code);
    console.log(`[MockOtpProvider] Sending OTP ${code} to ${phone}`);
    return {
      success: true,
      message: `OTP sent successfully. In development mode, use code: ${code}`,
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    // Allow either the standard mock code or dynamically registered code
    if (otp === config.mockOtp) return true;
    const stored = this.validCodes.get(phone);
    if (stored && stored === otp) {
      this.validCodes.delete(phone);
      return true;
    }
    return false;
  }
}

// Pluggable factory/singleton
export const otpProvider: IOtpProvider = new MockOtpProvider();
