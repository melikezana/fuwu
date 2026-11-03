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
  /** Bilgilendirme mesajı (ör. ustaya yeni randevu). */
  sendMessage(phone: string, message: string, options?: Pick<SmsSendOptions, "timeoutMs">): Promise<SmsSendResult>;
}
