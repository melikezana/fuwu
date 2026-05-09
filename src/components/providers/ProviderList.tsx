import { Button } from "@/components/common/Button";
import { appRoutes } from "@/constants/navigation";
import type { Provider } from "@/constants/providers";
import { ProviderCard } from "./ProviderCard";

type ProviderListProps = {
  providers: Provider[];
  totalCount: number;
};

export function ProviderList({ providers, totalCount }: ProviderListProps) {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="cursor-default select-none">
          <p className="text-sm font-black uppercase text-[var(--brand-orange-dark)]">Sana uygun ustalar</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--brand-navy)]">
            {providers.length} usta listelendi
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
            İstanbul genelinde {totalCount} aktif profil arasından puan, fiyat ve uygunlukla
            karşılaştırabileceğin sonuçlar.
          </p>
        </div>
        <Button className="w-full sm:w-fit" href={appRoutes.providerApplication} variant="secondary">
          Usta Ağına Katıl
        </Button>
      </div>

      {providers.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      ) : (
        <div className="mt-6 cursor-default rounded-lg bg-white p-7 text-center shadow-[0_18px_56px_rgba(13,20,36,0.07)] ring-1 ring-[rgba(13,20,36,0.08)]">
          <p className="text-xl font-black text-[var(--brand-navy)]">
            Bu filtrelerle usta bulunamadı.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--muted)]">
            Hizmet, ilçe veya uygunluk filtresini genişleterek daha fazla profili inceleyin.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={appRoutes.providers}>Filtreleri Temizle</Button>
            <Button href={appRoutes.providerApplication} variant="secondary">
              Usta Ağına Katıl
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
