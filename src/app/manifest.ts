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
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/fuwu-icon-512.png",
        type: "image/png",
      },
    ],
    name: "FUWU - Ev Hizmetleri",
    short_name: "FUWU",
    start_url: "/",
    theme_color: fuwuOrange,
  };
}
