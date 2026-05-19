<<<<<<< HEAD
import type { Metadata } from "next";
import Link from "next/link";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/components/request/RequestForm";
import { appRoutes } from "@/lib/constants/navigation";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { authAccessMessages } from "@/services/auth/constants";
import { getAuthenticatedServerUserId } from "@/services/auth/server";

export const metadata: Metadata = {
  title: "Talep Oluştur",
  description:
    "Fuwu hizmet talebi oluşturma akışı giriş yapan kullanıcılar için güvenli şekilde hazırlanır.",
};

export const dynamic = "force-dynamic";

function LoginRequiredState() {
  return (
    <Card className="min-w-0">
      <div className="cursor-default select-none">
        <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
          Giriş gerekli
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--brand-navy)]">
          {authAccessMessages.loginRequired}
        </h2>
        <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">
          Usta profillerini giriş yapmadan inceleyebilirsin. Ancak hizmet talebi oluşturmak için
          hesabınla devam etmen gerekir.
        </p>
        {!isSupabaseServerConfigured ? (
          <p className="mt-4 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Giriş ve veri bağlantısı henüz aktif olmadığı için bu ekranda gerçek talep kaydı
            alınmaz.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="w-full sm:w-fit" href={appRoutes.login}>
          Giriş Yap
        </Button>
        <Button className="w-full sm:w-fit" href={appRoutes.providers} variant="secondary">
          Usta Bul
        </Button>
      </div>
    </Card>
  );
}

export default async function RequestPage() {
  const authenticatedUserId = await getAuthenticatedServerUserId();

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#FFF7EC_42%,#ffffff_100%)]">
      <FuwuWatermark className="-right-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative grid min-h-[620px] gap-8 py-10 sm:py-14 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:py-16">
        <div className="min-w-0 cursor-default select-none">
          <Link
            aria-label="Fuwu ana sayfasına git"
            className="inline-flex cursor-pointer rounded-lg bg-[var(--brand-navy)] px-5 py-4 shadow-[0_24px_70px_rgba(13,20,36,0.18)] transition-colors hover:bg-[var(--brand-navy-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2"
            href={appRoutes.home}
          >
            <FuwuLogo inverted size="lg" />
          </Link>
          <p className="mt-7 text-sm font-black uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Talep oluştur
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-normal text-[var(--brand-navy)] sm:text-5xl">
            Talep oluşturmak için hesabınla devam et.
          </h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            Ustaları ve profilleri giriş yapmadan inceleyebilirsin. Hizmet talebi oluşturma adımı
            ise adres ve iletişim bilgisi içerdiği için yalnızca giriş yapan kullanıcılarla açılır.
          </p>
        </div>

        {authenticatedUserId ? (
          <RequestForm authenticatedUserId={authenticatedUserId} />
        ) : (
          <LoginRequiredState />
        )}
      </Container>
    </section>
=======
"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import Navbar from "@/components/layout/Navbar";
import { Alert } from "@/components/ui/Alerts";
import { requestService, RequestStatus } from "@/services/requests";
import { useTranslation } from "@/lib/i18n";
import { CATEGORIES, DISTRICTS } from "@/constants/filters";

export default function RequestPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      await requestService.createRequest({
        customer_id: null, // Guest
        customer_name: formData.get("name") as string,
        customer_phone: formData.get("phone") as string,
        category: formData.get("category") as string,
        district: formData.get("district") as string,
        description: formData.get("description") as string,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Talebiniz alınırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm text-center">
            <Alert 
              type="success"
              title="Talebiniz Alındı"
              message="Hizmet talebiniz başarıyla oluşturuldu. En kısa sürede sizinle iletişime geçeceğiz."
              className="mb-6"
            />
            <Button onClick={() => window.location.href = "/"} className="w-full">
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">Hizmet Talebi Oluştur</h2>
          
          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                <input required name="name" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="Ad Soyad" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Telefon</label>
                <input required name="phone" type="tel" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="05XX XXX XX XX" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Hizmet Kategorisi</label>
                <select required name="category" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] bg-white">
                  <option value="">Seçiniz...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">İlçe</label>
                <select required name="district" className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] bg-white">
                  <option value="">Seçiniz...</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Açıklama (Opsiyonel)</label>
              <textarea name="description" rows={3} className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]" placeholder="Eklemek istedikleriniz..."></textarea>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Gönderiliyor..." : "Talebi Gönder"}
            </Button>
          </form>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
