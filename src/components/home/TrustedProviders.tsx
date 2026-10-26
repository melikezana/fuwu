import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Container } from "@/components/ui/Container";
import type { Provider } from "@/types/provider";
import type { ProviderPurchase } from "@/lib/commerce/purchase-links";

export function TrustedProviders({ providers, purchases }: { providers: Provider[]; purchases: Record<string, ProviderPurchase> }) {
  return <section className="home-section" id="providers" aria-labelledby="featured-providers-title"><Container className="home-container"><div className="home-section-heading"><div><p className="home-eyebrow">İŞİNİ USTASINA BIRAK</p><h2 className="home-section-title" id="featured-providers-title">Doğru usta, iyi bir başlangıç.</h2><p className="home-section-description">Uzmanlığını, hizmetlerini ve gerçek değerlendirmelerini incele.</p></div><Link className="home-text-link" href="/providers">Tüm ustalar <ArrowRight size={17} aria-hidden /></Link></div><div className="home-provider-grid">{providers.map(provider => <ProviderCard provider={provider} purchase={purchases[provider.id]} key={provider.id} />)}</div></Container></section>;
}
