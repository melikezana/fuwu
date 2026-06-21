import type { SmsProvider, SmsSendResult } from "./types";

export class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    if (process.env.NODE_ENV !== "production") {
      console.info("[Fuwu] Mock SMS OTP", {
        code,
        phone,
      });
    }

    return { ok: true };
  }
}
