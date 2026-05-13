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

export default function Home() {
  return <MarketplaceHome />;
}
