import type { Metadata } from "next";
import { MarketplaceHome } from "@/components/home/MarketplaceHome";
import { createPageMetadata, seoConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: seoConfig.defaultTitle,
  description: seoConfig.defaultDescription,
  path: "/",
  keywords: [
    "İstanbul tesisatçı",
    "İstanbul elektrikçi",
    "ev temizliği",
    "Fuwu Hizmet",
  ],
});

type HomeSearchParams = {
  instant_match?: string | string[];
  match_budget?: string | string[];
  match_district?: string | string[];
  match_notes?: string | string[];
  match_service?: string | string[];
  match_time?: string | string[];
  smart_match?: string | string[];
};

type HomePageProps = {
  searchParams?: Promise<HomeSearchParams>;
};

function getSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const smartMatchInput = {
    budgetTag: getSearchParam(params?.match_budget),
    district: getSearchParam(params?.match_district),
    notes: getSearchParam(params?.match_notes),
    service: getSearchParam(params?.match_service),
    timePreference: getSearchParam(params?.match_time),
  };
  const isSmartMatchActive =
    getSearchParam(params?.instant_match) === "1" ||
    getSearchParam(params?.smart_match) === "1";

  return (
    <MarketplaceHome
      isSmartMatchActive={isSmartMatchActive}
      smartMatchInput={smartMatchInput}
    />
  );
}
