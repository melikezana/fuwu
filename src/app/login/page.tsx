import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { LoginOptions } from "@/components/auth/LoginOptions";
import { Container } from "@/components/ui/Container";
import { I18nText } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Giriş | FUWU",
  description: "Hesabına güvenle giriş yap. Hizmetlerini satın al, randevularını ve siparişlerini tek yerden takip et.",
};

export default function LoginPage() {
  return <section className="premium-login border-b border-[var(--border)]">
    <Container className="grid gap-8 py-7 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-20">
      <div className="premium-login-visual"><Image src="/images/services/provider-painting.webp" alt="İç mekânda duvar boyayan profesyonel" fill priority sizes="(max-width:1023px) 0px, 540px" /><div className="premium-login-caption"><span><ShieldCheck size={18} aria-hidden /> Evin için güvenle.</span><h2>Bir iş daha,<br />usta ellerde.</h2><p>İhtiyacın olan hizmeti seç.<br />Gününün geri kalanı sana kalsın.</p></div></div>
      <div className="min-w-0"><header className="premium-login-intro"><p className="commerce-eyebrow"><I18nText i18nKey="login.eyebrow" /></p><h1><I18nText i18nKey="login.title" /></h1><p><I18nText i18nKey="login.description" /></p></header>
        <Suspense fallback={<div className="commerce-skeleton h-96 rounded-2xl" role="status" aria-label="Giriş seçenekleri yükleniyor" />}><LoginOptions /></Suspense>
        <p className="commerce-help mt-5"><ShieldCheck size={17} aria-hidden /> Hesabın, adreslerin ve siparişlerin tek yerde.</p><Link className="commerce-text-link" href="/services">Önce hizmetleri keşfet →</Link>
      </div>
    </Container>
  </section>;
}
