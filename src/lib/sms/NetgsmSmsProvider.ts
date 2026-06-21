import type { SmsProvider, SmsSendResult } from "./types";

type NetgsmSmsProviderOptions = {
  header: string;
  password: string;
  usercode: string;
};

const netgsmSendEndpoint = "https://api.netgsm.com.tr/sms/send/get";

export class NetgsmSmsProvider implements SmsProvider {
  constructor(private readonly options: NetgsmSmsProviderOptions) {}

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const body = new URLSearchParams({
      gsmno: phone,
      message: `Fuwu doğrulama kodunuz: ${code}`,
      msgheader: this.options.header,
      password: this.options.password,
      usercode: this.options.usercode,
    });

    try {
      const response = await fetch(netgsmSendEndpoint, {
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      const responseText = (await response.text()).trim();
      const responseCode = responseText.split(/\s+/)[0];

      if (!response.ok || responseCode !== "00") {
        return {
          error: `Netgsm SMS gönderimi başarısız oldu (kod: ${responseCode || response.status}).`,
          ok: false,
        };
      }

      return { ok: true };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Netgsm SMS gönderimi sırasında bilinmeyen hata oluştu.",
        ok: false,
      };
    }
  }
}
