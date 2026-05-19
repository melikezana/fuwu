<<<<<<< HEAD
import type { Metadata } from "next";
import { appRoutes } from "@/lib/constants/navigation";
import { getProviderAvailabilityLabel } from "@/lib/constants/providers";
import {
  formatProviderRating,
  ProviderDashboardAccessPlaceholder,
  providerDashboardIcons,
  ProviderDashboardShell,
  ProviderSummaryCard,
} from "@/components/dashboard/ProviderDashboardUI";
import {
  getProviderDashboardAccess,
  type ProviderDashboardProfile,
} from "@/services/providers/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usta Paneli",
  description: "Fuwu onaylı ustaları için profil ve talep yönetimi temeli.",
};

function ProviderDashboardSummary({
  provider,
}: {
  provider: ProviderDashboardProfile;
}) {
  const cards = [
    {
      description: provider.isApproved
        ? "Profil bilgileri yayın için hazır."
        : "Profil inceleme süreci devam ediyor.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.shield,
      label: "Profil Durumu",
      value: provider.isApproved ? "Onaylı" : "İncelemede",
    },
    {
      description:
        provider.isActive && provider.isApproved
          ? "Profilin public usta listesinde görünebilir."
          : "Profil görünürlüğü şu anda kapalı.",
      href: appRoutes.providers,
      icon: providerDashboardIcons.eye,
      label: "Görünürlük Durumu",
      value: provider.isActive && provider.isApproved ? "Yayında" : "Kapalı",
    },
    {
      description: "Public kartlarda gösterilen güncel çalışma kapasiten.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.eye,
      label: "Uygunluk Durumu",
      value: getProviderAvailabilityLabel(provider.availability),
    },
    {
      description: "Talep eşleşmesi altyapısı hazırlanıyor.",
      href: appRoutes.providerDashboardRequests,
      icon: providerDashboardIcons.inbox,
      label: "Gelen Talepler",
      value: "0",
    },
    {
      description: "Yayındaki profil ortalaması.",
      href: appRoutes.providerDashboardProfile,
      icon: providerDashboardIcons.star,
      label: "Ortalama Puan",
      value: formatProviderRating(provider.rating),
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <ProviderSummaryCard
          description={card.description}
          href={card.href}
          icon={card.icon}
          key={card.label}
          label={card.label}
          value={card.value}
        />
      ))}
    </section>
  );
}

export default async function ProviderDashboardPage() {
  const providerAccess = await getProviderDashboardAccess();

  return (
    <ProviderDashboardShell
      active="overview"
      description="Profil görünürlüğünü, temel durumları ve gelen talep alanını tek ekranda takip et."
      providerName={providerAccess.ok ? providerAccess.profile.name : undefined}
      title="Usta Paneli"
    >
      {providerAccess.ok ? (
        <div className="grid gap-6">
          <ProviderDashboardSummary provider={providerAccess.profile} />

          <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[0_14px_40px_rgba(13,20,36,0.05)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="cursor-default select-none">
                <h2 className="text-xl font-black text-[var(--brand-navy)]">
                  Profil yönetimi yakında
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                  Fiyat aralığı, açıklama ve iletişim bilgileri için düzenleme akışı sonraki
                  sürümde bu panele eklenecek.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <ProviderDashboardAccessPlaceholder message={providerAccess.message} />
      )}
    </ProviderDashboardShell>
=======
"use client";

import Navbar from "@/components/layout/Navbar";
import { Alert } from "@/components/ui/Alerts";
import { Settings, Calendar, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import Link from "next/link";

export default function ProviderDashboardPage() {
  const [isProvider, setIsProvider] = useState<boolean | null>(null);

  useEffect(() => {
    checkProvider();
  }, []);

  const checkProvider = async () => {
    try {
      const providerStatus = await authService.isProvider();
      setIsProvider(providerStatus);
    } catch (err) {
      setIsProvider(false);
    }
  };

  if (isProvider === null) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 p-6 lg:px-12 max-w-7xl mx-auto w-full py-12">
          <div className="animate-pulse bg-white rounded-3xl p-8 shadow-sm h-64"></div>
        </div>
      </main>
    );
  }

  if (!isProvider) {
    return (
      <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm text-center flex flex-col items-center">
            <h2 className="text-2xl font-bold text-[#0D1424] mb-4">Erişim Bekleniyor</h2>
            <Alert 
              type="info" 
              message="Usta paneli için giriş ve profil eşleştirme yakında aktif olacak. Eğer başvurunuz onaylandıysa, giriş bilgileriniz SMS ile iletilecektir." 
              className="mb-6 text-left"
            />
            <Link 
              href="/"
              className="w-full bg-[#FF8A00] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#E67A00] transition-colors"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F6F8] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:px-12 max-w-7xl mx-auto w-full py-12">
        <h1 className="text-3xl font-bold text-[#0D1424] mb-2">Usta Paneli</h1>
        <p className="text-gray-500 mb-8">Profilinizi ve müsaitlik durumunuzu yönetin.</p>
        
        <Alert 
          type="info" 
          title="Geliştirme Aşamasında" 
          message="Usta paneli şu anda geliştirme aşamasındadır. Yakında profilinizi düzenleyebilecek ve doğrudan talepleri yanıtlayabileceksiniz." 
          className="mb-8"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 pointer-events-none">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Müsaitlik Durumu</h3>
              <p className="text-sm text-gray-500">Müşterilere şu an müsait olup olmadığınızı gösterin.</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF8A00] flex items-center justify-center">
              <CheckCircle size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Gelen Talepler</h3>
              <p className="text-sm text-gray-500">Bölgenizdeki yeni iş fırsatlarını inceleyin.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-600 flex items-center justify-center">
              <Settings size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Profil Ayarları</h3>
              <p className="text-sm text-gray-500">Hizmet bilgilerinizi ve fiyatlandırmanızı güncelleyin.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
>>>>>>> 41e55ab (Full marketplace backend auth and production update)
  );
}
