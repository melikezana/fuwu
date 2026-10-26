import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getProviderReviews } from "@/services/reviews";
import { Container } from "@/components/ui/Container";
import type { Provider } from "@/types/provider";

export async function CustomerVoices({ providers }: { providers: Provider[] }) {
  const groups = await Promise.all(providers.filter(p => p.reviewCount > 0).slice(0, 3).map(async provider => ({ provider, result: await getProviderReviews(provider.id) })));
  const reviews = groups.flatMap(({ provider, result }) => result.source === "supabase" && result.reviews[0] ? [{ provider, review: result.reviews[0] }] : []);
  if (!reviews.length) return null;
  return <section className="home-section" aria-labelledby="customer-voices-title"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">MÜŞTERİ DENEYİMLERİ</p><h2 id="customer-voices-title" className="home-section-title">İyi hizmet, iyi hissettirir.</h2><p className="home-section-description">FUWU’da paylaşılan gerçek değerlendirmeler.</p></div></div><div className="home-review-grid">{reviews.map(({ provider, review }) => <article className="home-review-card" key={review.id}><p className="home-review-rating"><Star size={16} fill="currentColor" aria-hidden />{review.rating} / 5</p><blockquote>{review.comment}</blockquote><footer><span>{provider.category}<small><time dateTime={review.createdAt}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(review.createdAt))}</time></small></span><Link href={`/providers/${provider.id}#reviews`}>Yorumu gör <ArrowRight size={16} aria-hidden /></Link></footer></article>)}</div></Container></section>;
}
