"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "genel" | "profil" | "talepler";

type ProviderData = {
  id: string;
  full_name: string;
  category: string;
  districts: string[];
  status: "pending" | "approved" | "rejected";
  phone?: string;
  rating?: number;
  created_at: string;
} | null;

export default function ProviderDashboardPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("genel");
  const [provider, setProvider] = useState<ProviderData>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/provider/dashboard");
        return;
      }

      setUserName(
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        ""
      );

      // Usta başvurusunu kontrol et
      try {
        const { data } = await supabase
          .from("provider_applications")
          .select("*")
          .eq("phone", user.user_metadata?.phone ?? "")
          .limit(1)
          .maybeSingle();

        if (data) {
          setProvider(data as ProviderData);
        }
      } catch {
        // tablo yoksa null bırak
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "genel",
      label: "Genel Bakış",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h10" />
        </svg>
      ),
    },
    {
      id: "profil",
      label: "Profil",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "talepler",
      label: "Talepler",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Başlık ── */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Fuwu Usta Paneli
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Usta Paneli
          </h1>
          <p className="text-[var(--color-muted)] text-sm">
            Profil görünürlüğünü, temel durumları ve gelen talep alanını tek ekranda takip et.
          </p>
        </div>

        {/* ── Sekmeler ── */}
        <div className="flex gap-1 p-1 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-zinc-900 text-[var(--color-text)] shadow-sm border border-[var(--color-border)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Genel Bakış ── */}
        {tab === "genel" && (
          <div className="space-y-4">
            {/* Durum kartı */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 space-y-5">

              {/* İkon + başlık */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand)]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[var(--color-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">
                    {provider?.status === "approved"
                      ? "Profilin yayında."
                      : "Usta paneli yakında aktif olacak."}
                  </h2>
                  <p className="text-sm text-[var(--color-muted)] mt-1 leading-relaxed">
                    {provider?.status === "approved"
                      ? "Profilin Fuwu'da yayınlanıyor. Müşteriler sana ulaşabilir."
                      : "Onaylı usta hesabı bağlandığında profil bilgileri, görünürlük durumu ve gelen talepler bu alandan yönetilecek."}
                  </p>
                </div>
              </div>

              {/* Durum bandı — artık lacivert değil, siteyle uyumlu */}
              <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2.5 ${
                provider?.status === "approved"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : provider?.status === "rejected"
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  provider?.status === "approved"
                    ? "bg-emerald-500"
                    : provider?.status === "rejected"
                    ? "bg-red-500"
                    : "bg-amber-400"
                }`} />
                {provider?.status === "approved"
                  ? "Profilin aktif ve yayında."
                  : provider?.status === "rejected"
                  ? "Başvurun bu aşamada uygun görülmedi. Tekrar başvurabilirsin."
                  : provider
                  ? "Başvurun inceleniyor. Onaylandığında profil Fuwu'da yayınlanır."
                  : "Henüz başvuru oluşturmadın. Usta ağına katılmak için başvur."}
              </div>

              {/* CTA butonlar */}
              <div className="flex flex-wrap gap-3">
                {provider?.status !== "approved" && (
                  <Link
                    href="/provider-application"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold transition-colors"
                  >
                    {provider ? "Başvuruyu Güncelle" : "Usta ağına katılmak için başvuru yap"}
                  </Link>
                )}
                <Link
                  href="/providers"
                  className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-sm font-medium transition-colors"
                >
                  Ustaları Gör
                </Link>
              </div>
            </div>

            {/* İstatistik kartları — onaylı usta için */}
            {provider?.status === "approved" && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Profil Görüntülenme", value: "—", sub: "Bu ay" },
                  { label: "Gelen Talep", value: "—", sub: "Bu ay" },
                  { label: "Puan", value: provider.rating ? `${provider.rating}/5` : "—", sub: "Ortalama" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 text-center space-y-1"
                  >
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs font-medium">{stat.label}</p>
                    <p className="text-xs text-[var(--color-muted)]">{stat.sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Profil sekmesi ── */}
        {tab === "profil" && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 space-y-5">
            {provider?.status === "approved" ? (
              <>
                <h2 className="text-base font-semibold">Profil Bilgilerin</h2>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Ad", value: provider.full_name },
                    { label: "Uzmanlık", value: provider.category },
                    { label: "Bölgeler", value: provider.districts?.join(", ") },
                    { label: "Telefon", value: provider.phone ?? "—" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-[var(--color-muted)]">{row.label}</span>
                      <span className="font-medium text-right max-w-[60%]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm font-medium">Profil bilgileri henüz mevcut değil.</p>
                <p className="text-xs text-[var(--color-muted)]">
                  Başvurun onaylandıktan sonra profil bilgilerin burada görünecek.
                </p>
                <Link
                  href="/provider-application"
                  className="inline-flex px-5 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-sm font-semibold transition-colors"
                >
                  Başvuru Yap
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Talepler sekmesi ── */}
        {tab === "talepler" && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand)]/10 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-[var(--color-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium">
                {provider?.status === "approved"
                  ? "Henüz gelen talep yok."
                  : "Talepler, onaylı usta hesabında görüntülenir."}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {provider?.status === "approved"
                  ? "Müşteriler seni bulduğunda talepler burada listelenir."
                  : "Başvurun onaylandıktan sonra gelen talepler burada görünecek."}
              </p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
