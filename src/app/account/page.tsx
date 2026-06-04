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
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  active: {
    label: "Aktif",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  completed: {
    label: "Tamamlandı",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800",
  },
  cancelled: {
    label: "İptal",
    cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700",
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

    init();
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
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
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* ── Profil kartı ── */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? "Profil"}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[var(--color-border)] flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
              {initials(profile.full_name, profile.email)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {profile.full_name && (
              <p className="font-semibold text-base truncate">{profile.full_name}</p>
            )}
            <p className="text-sm text-[var(--color-muted)] truncate">{profile.email}</p>
            {profile.created_at && (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Üye: {formatDate(profile.created_at)}
              </p>
            )}
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex-shrink-0 text-xs font-medium px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
          >
            {signingOut ? "Çıkılıyor…" : "Çıkış Yap"}
          </button>
        </section>

        {/* ── Hızlı işlemler ── */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/request"
            className="rounded-2xl border border-[var(--color-border)] p-4 flex items-center gap-3 hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-raised)] transition-all group"
          >
            <span className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] group-hover:border-[var(--color-brand)]/40 group-hover:text-[var(--color-brand)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="rounded-2xl border border-[var(--color-border)] p-4 flex items-center gap-3 hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-raised)] transition-all group"
          >
            <span className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] group-hover:border-[var(--color-brand)]/40 group-hover:text-[var(--color-brand)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Taleplerim
            </h2>
            <Link href="/request" className="text-xs font-medium text-[var(--color-brand)] hover:underline">
              + Yeni
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center space-y-3">
              <p className="text-sm font-medium">Henüz talep oluşturmadın.</p>
              <p className="text-xs text-[var(--color-muted)]">
                Hizmet ihtiyacını tarif et, uygun ustalarla eşleş.
              </p>
              <Link
                href="/request"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] transition-colors"
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
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold truncate">{req.category}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {req.district}{req.budget ? ` · ${req.budget}` : ""}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {formatDate(req.created_at)}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Yasal linkler ── */}
        <section className="border-t border-[var(--color-border)] pt-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
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
              className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--color-surface-raised)] transition-colors group"
            >
              <span className="text-sm text-[var(--color-muted)] group-hover:text-[var(--color-text)] transition-colors">
                {item.label}
              </span>
              <svg className="w-4 h-4 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}
