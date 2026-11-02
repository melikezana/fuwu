export const oauthErrors = {
  oauth_denied: "Google ile giriş tamamlanmadı. Tekrar deneyebilirsin.",
  oauth_exchange_failed: "Giriş bağlantısı geçersiz veya süresi dolmuş. Lütfen yeniden giriş yap.",
  oauth_unavailable: "Giriş hizmetine şu anda ulaşılamıyor. Lütfen tekrar dene.",
  profile_unavailable: "Oturum açıldı ancak hesap bilgileri hazırlanamadı. Lütfen yeniden dene.",
} as const;
export type OAuthErrorCode = keyof typeof oauthErrors;

// The adapter keeps the code exchange independently testable; production supplies Supabase SSR.
export async function completeOAuthSignIn(adapter: {
  exchange: () => Promise<boolean>;
  verifyUser: () => Promise<boolean>;
  ensureProfile: () => Promise<void>;
}): Promise<OAuthErrorCode | null> {
  try {
    if (!await adapter.exchange() || !await adapter.verifyUser()) return "oauth_exchange_failed";
  } catch { return "oauth_unavailable"; }
  try { await adapter.ensureProfile(); } catch { return "profile_unavailable"; }
  return null;
}
