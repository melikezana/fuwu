import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Container } from "@/components/ui/Container";
import type { Provider } from "@/types/provider";
import type { ProviderPurchase } from "@/lib/commerce/purchase-links";

export function TrustedProviders({ providers, purchases }: { providers: Provider[]; purchases: Record<string, ProviderPurchase> }) {
  if (!providers.length) return <section className="home-section" id="about" aria-labelledby="provider-network-title"><Container className="home-container"><div className="prelaunch-network"><div><p className="home-eyebrow">FUWU PARTNER</p><h2 className="home-section-title" id="provider-network-title">Usta ağımızı kuruyoruz.</h2><p>Alanında uzman hizmet verenleri FUWU&apos;ya davet ediyoruz.</p></div><Link className="home-primary-link" href="/provider-application">Usta Ol <ArrowRight size={18} aria-hidden /></Link></div></Container></section>;
  return <section className="home-section" id="providers" aria-labelledby="featured-providers-title"><Container className="home-container"><div className="home-section-heading"><div><h2 className="home-section-title" id="featured-providers-title">Ustanı tanı.</h2><p className="home-section-description">Uzmanlığını ve varsa gerçek yorumlarını incele.</p></div><Link className="home-text-link" href="/providers">Tüm ustalar <ArrowRight size={17} aria-hidden /></Link></div><div className="home-provider-grid">{providers.map(provider => <ProviderCard provider={provider} purchase={purchases[provider.id]} key={provider.id} />)}</div></Container></section>;
}
