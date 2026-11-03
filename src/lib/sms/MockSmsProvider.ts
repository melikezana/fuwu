import type { SmsProvider, SmsSendOptions, SmsSendResult } from "./types";

export class MockSmsProvider implements SmsProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendOtp(phone: string, code: string, _options?: SmsSendOptions): Promise<SmsSendResult> {
    if (process.env.NODE_ENV !== "production") {
      console.info("[FUWU] Mock SMS OTP", {
        code,
        phone,
      });
    }

    return { ok: true };
  }
}
