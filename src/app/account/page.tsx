"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
};

type ServiceRequest = {
  id: string;
  category: string;
  district: string;
  status: string;
  created_at: string;
  budget?: string;
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Beklemede",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  yeni: {
    label: "Yeni",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  inceleniyor: {
    label: "İnceleniyor",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ustaya_yonlendirildi: {
    label: "Ustaya Yönlendirildi",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  accepted: {
    label: "Kabul Edildi",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  on_the_way: {
    label: "Yolda",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  active: {
    label: "Aktif",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Tamamlandı",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  tamamlandi: {
    label: "Tamamlandı",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "İptal",
    cls: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
  iptal: {
    label: "İptal",
    cls: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
};

export default function AccountPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      // Supabase bağlı değilse login'e yönlendir
      if (!supabase) {
        router.push("/login?next=/account");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/account");
        return;
      }

      setProfile({
        id: user.id,
        email: user.email ?? undefined,
        full_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          undefined,
        avatar_url: user.user_metadata?.avatar_url ?? undefined,
        created_at: user.created_at,
      });

      try {
        const { data } = await supabase
          .from("service_requests")
          .select("id, category, district, status, created_at, budget")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setRequests(data ?? []);
      } catch {
        setRequests([]);
      }

      setLoading(false);
    };

    void init();
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
  };

  const initials = (name?: string, email?: string) => {
    if (name)
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return email?.[0]?.toUpperCase() ?? "?";
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-2 border-[var(--brand-orange)] border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">

        {/* Profil kartı */}
        <section className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_8px_32px_rgba(13,20,36,0.06)]">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? "Profil"}
              className="size-14 flex-shrink-0 rounded-full object-cover ring-2 ring-[var(--border)]"
            />
          ) : (
            <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)] text-lg font-black text-white">
              {initials(profile.full_name, profile.email)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {profile.full_name && (
              <p className="truncate font-black text-[var(--brand-navy)]">{profile.full_name}</p>
            )}
            <p className="truncate text-sm font-semibold text-[var(--muted)]">{profile.email}</p>
            {profile.created_at && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Üye: {formatDate(profile.created_at)}
              </p>
            )}
          </div>

          <button
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex-shrink-0 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
          >
            {signingOut ? "Çıkılıyor…" : "Çıkış Yap"}
          </button>
        </section>

        {/* Hızlı işlemler */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/request"
            className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 transition hover:border-[rgba(255,138,0,0.5)] hover:bg-[var(--brand-orange-soft)]"
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white transition group-hover:border-[rgba(255,138,0,0.4)] group-hover:text-[var(--brand-orange)]">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-black text-[var(--brand-navy)]">Yeni Talep</p>
              <p className="text-xs text-[var(--muted)]">Usta talep et</p>
            </div>
          </Link>

          <Link
            href="/providers"
            className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 transition hover:border-[rgba(255,138,0,0.5)] hover:bg-[var(--brand-orange-soft)]"
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white transition group-hover:border-[rgba(255,138,0,0.4)] group-hover:text-[var(--brand-orange)]">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-black text-[var(--brand-navy)]">Usta Bul</p>
              <p className="text-xs text-[var(--muted)]">Profilleri gör</p>
            </div>
          </Link>
        </section>

        {/* Taleplerim */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
              Taleplerim
            </h2>
            <Link href="/request" className="text-xs font-black text-[var(--brand-orange)] hover:underline">
              + Yeni
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
              <p className="text-sm font-black text-[var(--brand-navy)]">Henüz talep oluşturmadın.</p>
              <p className="text-xs text-[var(--muted)]">
                Hizmet ihtiyacını tarif et, uygun ustalarla eşleş.
              </p>
              <Link
                href="/request"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-500"
              >
                İlk Talebini Oluştur
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => {
                const s = STATUS_MAP[req.status] ?? STATUS_MAP.pending;
                return (
                  <div
                    key={req.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(13,20,36,0.04)]"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-black text-[var(--brand-navy)]">{req.category}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {req.district}{req.budget ? ` · ${req.budget}` : ""}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{formatDate(req.created_at)}</p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Yasal linkler */}
        <section className="space-y-1 border-t border-[var(--border)] pt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--muted)]">
            Yasal
          </p>
          {[
            { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
            { href: "/gizlilik", label: "Gizlilik Politikası" },
            { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
            { href: "/cerez-politikasi", label: "Çerez Politikası" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-[var(--surface-soft)]"
            >
              <span className="text-sm text-[var(--muted)] transition group-hover:text-[var(--brand-navy)]">
                {item.label}
              </span>
              <svg className="size-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}
