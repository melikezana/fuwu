export type SmsSendResult = {
  ok: boolean;
  error?: string;
};

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;
}
