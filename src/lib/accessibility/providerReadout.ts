import type { Provider } from "@/types/provider";

export type ProviderReadoutMessages = {
  empty: string;
  reading: string;
  readingLimited: string;
  unsupported: string;
};

const defaultReadoutMessages: ProviderReadoutMessages = {
  empty: "Sesli okunacak profil bulunamadı.",
  reading: "Profiller sesli okunuyor.",
  readingLimited: "İlk 6 profil sesli okunuyor.",
  unsupported: "Bu tarayıcı sesli okumayı desteklemiyor.",
};

export function getProviderSpeechSummary(provider: Provider) {
  return `${provider.name}, ${provider.district}, ${provider.category}, ${provider.rating.toFixed(
    1,
  )} puan, fiyat aralığı ${provider.averagePrice}`;
}

export function readProviderSummaries(
  providers: Provider[],
  messages: ProviderReadoutMessages = defaultReadoutMessages,
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return {
      ok: false,
      message: messages.unsupported,
    };
  }

  if (providers.length === 0) {
    return {
      ok: false,
      message: messages.empty,
    };
  }

  const summaries = providers.slice(0, 6).map(getProviderSpeechSummary);
  const utterance = new SpeechSynthesisUtterance(summaries.join(". "));

  utterance.lang = "tr-TR";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  return {
    ok: true,
    message: providers.length > 6 ? messages.readingLimited : messages.reading,
  };
}
