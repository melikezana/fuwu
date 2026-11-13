import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Clock3, LifeBuoy, Mail } from "lucide-react";
import { ContactForm } from "@/components/support/ContactForm";
import { appRoutes } from "@/lib/constants/navigation";
import { customerServiceContact } from "@/lib/constants/contact";
import { createPageMetadata } from "@/lib/seo";
import { getServerAuthContext } from "@/services/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "İletişim",
  description: "FUWU destek ekibine yaz: sipariş, usta başvurusu, hesap ve KVKK talepleri için iletişim formu.",
  path: appRoutes.contact,
  keywords: ["FUWU iletişim", "FUWU destek", "usta başvurusu destek"],
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ konu?: string }> }) {
  const [{ konu }, auth] = await Promise.all([searchParams, getServerAuthContext().catch(() => null)]);
  const email = auth?.user?.email ?? "";

  return (
    <div className="commerce-page">
      <header className="commerce-page-header">
        <p className="commerce-eyebrow">İLETİŞİM</p>
        <h1>Nasıl yardımcı olabiliriz?</h1>
        <p>Formu doldur, destek ekibimiz e-postayla dönsün. Siparişinle ilgili bir sorunsa en hızlı yol sipariş ekranındaki “Sorun Bildir” alanıdır.</p>
      </header>
      <div className="fusion-two-columns">
        <section className="commerce-panel" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title"><LifeBuoy aria-hidden size={22} /> Destek formu</h2>
          <ContactForm defaultEmail={email} defaultTopic={konu} />
        </section>
        <section className="commerce-panel" aria-labelledby="contact-channels-title">
          <h2 id="contact-channels-title">Diğer kanallar</h2>
          <ul className="grid gap-4">
            <li><a className="commerce-secondary" href={`mailto:${customerServiceContact.email}`}><Mail aria-hidden size={18} /> {customerServiceContact.email}</a></li>
            <li><a className="commerce-secondary" href={customerServiceContact.instagramHref} rel="noopener noreferrer" target="_blank"><Camera aria-hidden size={18} /> @{customerServiceContact.instagramHandle}</a></li>
          </ul>
          <p className="commerce-help mt-4 flex items-center gap-2"><Clock3 aria-hidden size={16} /> Mesajlarını sırayla okuyor, en kısa sürede dönüyoruz.</p>
          <h3 className="mt-6">Hızlı bağlantılar</h3>
          <ul className="mt-2 grid gap-3 text-sm font-semibold [&_a]:text-[var(--brand-orange-dark)] [&_a]:underline [&_a]:underline-offset-4">
            <li><Link href={appRoutes.faq}>Sık sorulan sorular</Link></li>
            <li><Link href={appRoutes.orders}>Siparişlerim</Link></li>
            <li><Link href={appRoutes.providerApplication}>Usta başvurusu</Link></li>
            <li><Link href={`${appRoutes.contact}?konu=${encodeURIComponent("KVKK / kişisel veri talebi")}`}>KVKK başvurusu</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
