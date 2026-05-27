"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { appRoutes } from "@/lib/constants/navigation";
import { minimumRatingOptions } from "@/lib/constants/providers";
import { useI18n } from "@/lib/i18n";
import type { ProviderFilterOptions } from "@/services/providers";

type HomeHeroFiltersProps = {
  filterOptions: ProviderFilterOptions;
};

const heroServiceFilterOptions = [
  "Tesisat",
  "Elektrik",
  "Temizlik",
  "Halı Yıkama",
  "Klima & Beyaz Eşya",
  "Mobilya Montaj",
  "Boya Badana",
  "Nakliye Yardımı",
];

const fieldBaseClassName =
  "mt-1.5 h-12 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-sm font-medium leading-5 text-[var(--brand-navy)] outline-none transition-all placeholder:text-[#6B7280] focus:border-[var(--brand-orange)] focus:bg-white focus:ring-4 focus:ring-[rgba(255,138,0,0.15)] hover:border-[#D1D5DB]";

const selectClassName = `${fieldBaseClassName} cursor-pointer select-none overflow-hidden text-ellipsis pr-10 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat`;

function HeroField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0 cursor-default">
      <span className="block cursor-default select-none text-[0.7rem] font-bold uppercase tracking-wide text-[#6B7280] ml-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export function HomeHeroFilters({ filterOptions }: HomeHeroFiltersProps) {
  const { t } = useI18n();
  const router = useRouter();
  const serviceFilterOptions = Array.from(
    new Set([...heroServiceFilterOptions, ...filterOptions.categories]),
  );

  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("");
  const [offeredPrice, setOfferedPrice] = useState<number>(500);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<{ requestCode: string; confirmationCode?: string } | null>(null);

  useEffect(() => {
    if (budget === "acil" && category) {
      import("@/services/requests/emergency").then(({ calculateSuggestedPrice }) => {
        calculateSuggestedPrice(category).then(setOfferedPrice);
      });
    }
  }, [budget, category]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const district = formData.get("district") as string;
    
    if (budget === "acil") {
      setIsSubmitting(true);
      try {
        const { createEmergencyMatchRequest } = await import("@/services/requests/emergency");
        const offerAmount = formData.get("offerAmount") as string;
        const paymentPreference = formData.get("paymentPreference") as string;
        
        const result = await createEmergencyMatchRequest({
          serviceCategory: category || "Genel Hizmet",
          district: district || "Bilinmiyor",
          fullAddress: district || "Bilinmiyor",
          urgencyLevel: "acil",
          preferredDate: "Hemen",
          preferredTimeRange: "Acil",
          fullName: "Fuwu Müşterisi",
          phoneNumber: "",
          shortDescription: `Acil Hizmet Talebi`,
          urgencyType: "emergency",
          budgetTag: "acil",
          offeredPrice: offeredPrice,
          paymentPreference: paymentPreference || "nakit",
          approximateLocation: district || "Bilinmiyor",
        });
        
        setEmergencyResult(result);
      } catch (error) {
        console.error("Acil talep oluşturulamadı", error);
        alert("Talep oluşturulurken bir hata oluştu.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Normal Flow
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${appRoutes.providers}?${queryString}` : appRoutes.providers);
  };

  if (emergencyResult) {
    return (
      <div className="mt-6 w-full max-w-full cursor-default overflow-hidden rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(13,20,36,0.08)] ring-1 ring-[#F3F4F6] text-center lg:mt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FDF4] text-[#166534] mb-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-[var(--brand-navy)]">Uygun Ustalara Bildirim Gönderildi!</h3>
        <p className="mt-2 text-sm font-medium text-[#6B7280]">Birazdan usta eşleşmesi gerçekleşecek. Lütfen bekleyin.</p>
        
        <div className="mt-6 grid gap-4 sm:grid-cols-2 text-left">
          <div className="rounded-xl bg-[#F9FAFB] p-4 ring-1 ring-[#F3F4F6]">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tahmini Varış Süresi</p>
            <p className="mt-1 text-lg font-bold text-[var(--brand-orange-dark)]">15-20 dk</p>
          </div>
          <div className="rounded-xl bg-[#F9FAFB] p-4 ring-1 ring-[#F3F4F6]">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Karşılıklı Doğrulama Kodu</p>
            <p className="mt-1 text-lg font-bold text-[var(--brand-navy)] tracking-widest">{emergencyResult.confirmationCode}</p>
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-[var(--brand-orange-soft)] p-3 text-xs font-medium text-[var(--brand-orange-dark)]">
          İş güvenliği için doğrulama kodunu ustaya iş başlangıcında iletin. IBAN bilginiz gizli tutulmaktadır.
        </div>
      </div>
    );
  }

  return (
    <form
      action={appRoutes.providers}
      className="mt-6 w-full max-w-full cursor-default overflow-hidden rounded-xl bg-white p-4 shadow-[0_20px_60px_rgba(13,20,36,0.08)] ring-1 ring-[#F3F4F6] sm:p-6 lg:mt-8"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.5fr_1fr_auto] lg:items-end">
        <div className="min-w-0">
          <HeroField label={t("filters.service")}>
            <select 
              className={selectClassName} 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              name="category" 
              required
            >
              <option value="">{t("filters.allServices")}</option>
              {serviceFilterOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        <div className="min-w-0">
          <HeroField label={t("filters.district")}>
            <select className={selectClassName} defaultValue="" name="district" required>
              <option value="">{t("filters.allDistricts")}</option>
              {filterOptions.districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </HeroField>
        </div>

        {budget === "acil" ? (
          <>
            <div className="min-w-0">
              <HeroField label="Teklif Tutarı (₺)">
                <div className="mt-1.5 flex h-12 items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-2 shadow-sm">
                  <button 
                    type="button" 
                    onClick={() => setOfferedPrice(p => Math.max(0, p - 10))}
                    className="flex h-8 w-12 items-center justify-center rounded-md bg-[#F3F4F6] text-sm font-bold text-[#4B5563] hover:bg-[#E5E7EB] active:bg-[#D1D5DB]"
                  >-10</button>
                  <span className="text-lg font-bold text-[var(--brand-navy)]">{offeredPrice} ₺</span>
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => setOfferedPrice(p => p + 10)}
                      className="flex h-8 w-12 items-center justify-center rounded-md bg-[#F0FDF4] text-sm font-bold text-[#166534] hover:bg-[#DCFCE7] active:bg-[#BBF7D0]"
                    >+10</button>
                    <button 
                      type="button" 
                      onClick={() => setOfferedPrice(p => p + 50)}
                      className="flex h-8 w-12 items-center justify-center rounded-md bg-[#F0FDF4] text-sm font-bold text-[#166534] hover:bg-[#DCFCE7] active:bg-[#BBF7D0]"
                    >+50</button>
                  </div>
                </div>
              </HeroField>
            </div>
            <div className="min-w-0">
              <HeroField label="Ödeme Tercihi">
                <select className={selectClassName} defaultValue="nakit" name="paymentPreference">
                  <option value="nakit">Nakit</option>
                  <option value="iban">IBAN ile Ödeme</option>
                </select>
              </HeroField>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <HeroField label={t("filters.rating")}>
              <select className={selectClassName} defaultValue="" name="rating">
                <option value="">{t("filters.allRatings")}</option>
                {minimumRatingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t("filters.ratingAtLeast", { rating: option.value.replace(".", ",") })}
                  </option>
                ))}
              </select>
            </HeroField>
          </div>
        )}

        <Button 
          className={`h-12 min-h-[3rem] w-full min-w-[140px] rounded-lg px-6 font-bold text-white shadow-[0_8px_20px_rgba(255,138,0,0.25)] transition-all hover:shadow-[0_12px_24px_rgba(255,138,0,0.35)] lg:col-span-1 ${budget === "acil" ? "bg-[#DC2626] hover:bg-[#B91C1C] shadow-[0_8px_20px_rgba(220,38,38,0.25)] hover:shadow-[0_12px_24px_rgba(220,38,38,0.35)]" : "bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-dark)]"} ${budget === "acil" ? "sm:col-span-2 lg:col-span-full" : ""}`}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "İşleniyor..." : (budget === "acil" ? "Acil Usta Çağır" : t("cta.findProvider"))}
        </Button>
      </div>

      <div className="mt-5 pt-5 border-t border-[#F3F4F6]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="block cursor-default select-none text-[0.7rem] font-bold uppercase tracking-wide text-[#6B7280]">
            Bütçe Tercihi
          </span>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="" checked={budget === ""} onChange={(e) => setBudget(e.target.value)} className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Tümü
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="ekonomik" checked={budget === "ekonomik"} onChange={(e) => setBudget(e.target.value)} className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Ekonomik
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="standart" checked={budget === "standart"} onChange={(e) => setBudget(e.target.value)} className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Standart
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="premium" checked={budget === "premium"} onChange={(e) => setBudget(e.target.value)} className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[var(--brand-orange)] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[var(--brand-orange-dark)] peer-checked:shadow-[0_4px_12px_rgba(255,138,0,0.25)]">
                Premium
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="budget" value="acil" checked={budget === "acil"} onChange={(e) => setBudget(e.target.value)} className="peer sr-only" />
              <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#F3F4F6] px-4 text-xs font-bold text-[#4B5563] transition-all peer-checked:bg-[#DC2626] peer-checked:text-white hover:bg-[#E5E7EB] peer-checked:hover:bg-[#B91C1C] peer-checked:shadow-[0_4px_12px_rgba(220,38,38,0.25)]">
                Acil Hizmet
              </span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
