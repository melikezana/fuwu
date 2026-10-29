export type QualityInput = {
  name?: string | null; description?: string | null; category_id?: string | null; district_id?: string | null;
  experience_years?: number | null; is_verified?: boolean | null; identity_verified?: boolean | null;
  rating?: number | null; review_count?: number | null; actual_review_count?: number | null; actual_rating?: number | null;
};
export const qualityLabels = {
  repeated_text: "Anlamsız karakter veya kelime tekrarı",
  abusive_text: "Hakaret veya uygunsuz ifade şüphesi",
  test_profile: "Test kaydı olabilecek içerik",
  experience_claim: "Deneyim iddiası için kanıt gerekli",
  verification_claim: "Doğrulama iddiası ile kayıt uyuşmuyor",
  rating_mismatch: "Puan veya yorum sayısı kayıtlarla uyuşmuyor",
  missing_service: "Hizmet açıklaması, kategori veya ilçe eksik",
} as const;
export type QualityFlag = keyof typeof qualityLabels;

// Signals are review reasons, never proof of abuse/fraud. Original content is preserved.
export function assessProviderQuality(input: QualityInput): QualityFlag[] {
  const text = `${input.name || ""} ${input.description || ""}`.normalize("NFKC").toLocaleLowerCase("tr-TR");
  const flags: QualityFlag[] = [];
  if (/(.)\1{5,}|(\p{L}{2,4})\2{3,}|\b(\p{L}{2,})(?:\s+\3){3,}|[bcçdfgğhjklmnprsştvyzqwx]{10,}/u.test(text) || /(?:asdf|qwer|lorem ipsum|deneme deneme)/.test(text)) flags.push("repeated_text");
  if (/(?:^|[^\p{L}])(?:aptal|salak|şerefsiz|siktir|orospu)(?:$|[^\p{L}])/u.test(text)) flags.push("abusive_text");
  if (/(?:^|[^\p{L}])(?:test|demo|deneme|smoke|fixture)(?:$|[^\p{L}])/u.test(text)) flags.push("test_profile");
  const claimedYears = [...text.matchAll(/(\d{1,3})\s*y[ıi]ll?[ıi]k/g)].map(m => Number(m[1]));
  if ((input.experience_years ?? 0) > 65 || claimedYears.some(n => n > 65 || (input.experience_years != null && n !== input.experience_years))) flags.push("experience_claim");
  if ((input.is_verified && !input.identity_verified) || (!input.identity_verified && /kimli[ğg]i?\s*do[ğg]rulan|doğrulanmış usta|fuwu onaylı/.test(text))) flags.push("verification_claim");
  if ((input.rating ?? 0) < 0 || (input.rating ?? 0) > 5 || ((input.rating ?? 0) > 0 && input.review_count === 0) ||
    (input.actual_review_count != null && input.review_count != null && input.actual_review_count !== input.review_count) ||
    (input.actual_rating != null && input.rating != null && Math.abs(input.actual_rating - input.rating) > .11)) flags.push("rating_mismatch");
  if (!input.name?.trim() || (input.description?.trim().length ?? 0) < 30 || !input.category_id || !input.district_id) flags.push("missing_service");
  return flags;
}
