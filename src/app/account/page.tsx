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

type Request = {
  id: string;
  category: string;
  district: string;
  status: string;
  created_at: string;
  budget?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Beklemede",   color: "text-amber-600  bg-amber-50  dark:text-amber-400 dark:bg-amber-950/30  border-amber-200  dark:border-amber-900"  },
  active:     { label: "Aktif",       color: "text-green-600  bg-green-50  dark:text-green-400 dark:bg-green-950/30  border-green-200  dark:border-green-900"  },
  completed:  { label: "Tamamlandı",  color: "text-sky-600    bg-sky-50    dark:text-sky-400   dark:bg-sky-950/30   border-sky-200    dark:border-sky-900"    },
  cancelled:  { label: "İptal",       color: "text-zinc-500   bg-zinc-100  dark:text-zinc-400  dark:bg-zinc-800/40  border-zinc-200   dark:border-zinc-700"   },
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/account");
        return;
      }

      setProfile({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
        avatar_url: user.user_metadata?.avatar_url ?? undefined,
        created_at: user.created_at,
      });

      // Kullanıcının taleplerini getir
      try {
        const { data } = await supabase
          .from("service_requests")
          .select("id, category, district, status, created_at, budget")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        setRequests(data ?? []);
      } catch {
        // Tablo yoksa boş bırak
        setRequests([]);
      }

      setLoading(false);
    };

    load();
  }, [supabase, router]);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    await supabase.auth.signOut();
    router.push("/");
  };

  const initials = (name?: string, email?: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() ?? "?";
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── Profil Kartı ── */}
        <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profil"}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[var(--color-border)]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[var(--color-brand)]/12 border border-[var(--color-brand)]/20 flex items-center justify-center text-[var(--color-brand)] font-semibold text-lg">
                {initials(profile.full_name, profile.email)}
              </div>
            )}

            {/* Bilgi */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold tracking-tight truncate">
                {profile.full_name ?? "Hesabım"}
              </h1>
              <p className="text-sm text-[var(--color-muted)] truncate">{profile.email}</p>
              {profile.created_at && (
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Üye: {formatDate(profile.created_at)}
                </p>
              )}
            </div>

            {/* Çıkış */}
            <button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="flex-shrink-0 px-4 py-2 text-xs font-medium rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
            >
              {signOutLoading ? "Çıkılıyor..." : "Çıkış Yap"}
            </button>
          </div>
        </section>

        {/* ── Hızlı İşlemler ── */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/request"
            className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-raised)] transition-all group"
          >
            <span className="w-9 h-9 rounded-xl bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)] group-hover:bg-[var(--color-brand)]/15 transition-colors">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium">Yeni Talep</p>
              <p className="text-xs text-[var(--color-muted)]">Usta talep et</p>
            </div>
          </Link>

          <Link
            href="/providers"
            className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-raised)] transition-all group"
          >
            <span className="w-9 h-9 rounded-xl bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)] group-hover:bg-[var(--color-brand)]/15 transition-colors">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium">Usta Bul</p>
              <p className="text-xs text-[var(--color-muted)]">Profilleri gör</p>
            </div>
          </Link>
        </section>

        {/* ── Taleplerim ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Taleplerim
            </h2>
            {requests.length > 0 && (
              <Link
                href="/request"
                className="text-xs text-[var(--color-brand)] hover:underline font-medium"
              >
                + Yeni Talep
              </Link>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border)] rounded-2xl px-6 py-10 text-center space-y-3">
              <p className="text-sm font-medium">Henüz talep oluşturmadın.</p>
              <p className="text-xs text-[var(--color-muted)]">
                Hizmet ihtiyacını tarif et, uygun ustalarla eşleş.
              </p>
              <Link
                href="/request"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--color-brand)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-brand-hover)] transition-colors"
              >
                İlk Talebini Oluştur
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const statusInfo = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
                return (
                  <div
                    key={req.id}
                    className="flex items-start justify-between gap-4 px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-brand)]/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{req.category}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {req.district}
                        {req.budget && ` · ${req.budget}`}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">{formatDate(req.created_at)}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Yasal / Destek ── */}
        <section className="border-t border-[var(--color-border)] pt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Hesap & Destek</h2>
          <nav className="space-y-1">
            {[
              { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
              { href: "/gizlilik", label: "Gizlilik Politikası" },
              { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--color-surface-raised)] transition-colors group"
              >
                <span className="text-sm text-[var(--color-muted)] group-hover:text-[var(--color-text)]">{item.label}</span>
                <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </nav>
        </section>

      </div>
    </main>
  );
}
