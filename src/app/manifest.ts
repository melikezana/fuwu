import type { MetadataRoute } from "next";

const fuwuOrange = "#ff6500";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    scope: "/",
    lang: "tr",
    dir: "ltr",
    description: "Ev hizmetlerini keşfet, ustaları karşılaştır ve randevunu planla.",
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/fuwu-icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/fuwu-icon-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/fuwu-icon-512.png",
        type: "image/png",
      },
    ],
    categories: ["lifestyle", "shopping", "business"],
    name: "FUWU - Ev Hizmetleri",
    orientation: "portrait",
    shortcuts: [
      { name: "Hizmetler", short_name: "Hizmetler", url: "/services", icons: [{ src: "/icons/fuwu-icon-192.png", sizes: "192x192" }] },
      { name: "Siparişlerim", short_name: "Siparişler", url: "/orders", icons: [{ src: "/icons/fuwu-icon-192.png", sizes: "192x192" }] },
      { name: "Usta Paneli", short_name: "Usta Paneli", url: "/provider-dashboard", icons: [{ src: "/icons/fuwu-icon-192.png", sizes: "192x192" }] },
    ],
    short_name: "FUWU",
    start_url: "/",
    theme_color: fuwuOrange,
  };
}
