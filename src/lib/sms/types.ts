export type SmsSendResult = {
  ok: boolean;
  error?: string;
};

export type SmsSendOptions = {
  /** Varsayılan metin yerine gönderilecek tam mesaj. */
  message?: string;
  /** Sağlayıcı isteği için üst süre (ms). */
  timeoutMs?: number;
};

export interface SmsProvider {
  sendOtp(phone: string, code: string, options?: SmsSendOptions): Promise<SmsSendResult>;
}
