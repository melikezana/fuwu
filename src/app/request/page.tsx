import type { Metadata } from "next";
import { FuwuLogo, FuwuWatermark } from "@/components/brand/FuwuLogo";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Container } from "@/components/common/Container";
import { RequestForm } from "@/components/request/RequestForm";
import { appRoutes } from "@/constants/navigation";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Talep Oluştur | Fuwu",
  description:
    "Fuwu hizmet talebi oluşturma akışı giriş yapan kullanıcılar için güvenli şekilde hazırlanır.",
};

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user.id) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user?.id ?? null;
}

function LoginRequiredState() {
  return (
    <Card className="min-w-0">
      <div className="cursor-default select-none">
        <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
          Giriş gerekli
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[var(--brand-navy)]">
          Hizmet talebi oluşturmak için giriş yapmalısın.
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
  const authenticatedUserId = await getAuthenticatedUserId();

  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#FFF7EC_42%,#ffffff_100%)]">
      <FuwuWatermark className="-right-20 top-10 text-[10rem] opacity-[0.04] sm:text-[13rem]" />
      <Container className="relative grid min-h-[620px] gap-8 py-10 sm:py-14 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:py-16">
        <div className="min-w-0 cursor-default select-none">
          <div className="inline-flex rounded-lg bg-[var(--brand-navy)] px-5 py-4 shadow-[0_24px_70px_rgba(13,20,36,0.18)]">
            <FuwuLogo inverted size="lg" />
          </div>
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
  );
}
