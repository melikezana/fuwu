"use client";
import Link from "next/link";
import { Camera, Mail } from "lucide-react";
import { FuwuLogo } from "@/components/brand/FuwuLogo";
import { Container } from "@/components/ui/Container";
import { customerServiceContact } from "@/lib/constants/contact";
import { appRoutes } from "@/lib/constants/navigation";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  const discover = [[appRoutes.services, t("nav.services")], [appRoutes.providers, t("cta.findProvider")], [appRoutes.orders, "Siparişlerim"], [appRoutes.providerApplication, "Usta Ol"]];
  const legal = [[appRoutes.kvkk, t("footer.kvkk")], [appRoutes.privacy, t("footer.privacy")], [appRoutes.terms, t("footer.terms")], [appRoutes.cookies, t("footer.cookies")]];
  return <footer className="app-footer" id="contact"><Container className="home-container">
    <div className="app-footer-top"><Link href="/"><FuwuLogo size="sm" /></Link><p>İstanbul, Türkiye</p></div>
    <nav aria-label={t("footer.discoverAria")} className="app-footer-discover">{discover.map(([href,label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
    <div className="app-footer-contact"><a href={`mailto:${customerServiceContact.email}`}><Mail size={18} aria-hidden />{t("footer.email")}</a><a href={customerServiceContact.instagramHref} target="_blank" rel="noopener noreferrer" aria-label={t("footer.instagramAria")}><Camera size={18} aria-hidden />Instagram</a></div>
    <details className="app-footer-details"><summary>Yardım ve yasal bilgiler</summary><nav aria-label={t("footer.policyAria")}><Link href={appRoutes.howItWorks}>{t("nav.howItWorks")}</Link><Link href={appRoutes.trust}>{t("nav.trust")}</Link><Link href={appRoutes.faq}>{t("footer.faq")}</Link>{legal.map(([href,label]) => <Link href={href} key={href}>{label}</Link>)}</nav></details>
    <p className="app-footer-copyright">{t("footer.copyright")}</p>
  </Container></footer>;
}
