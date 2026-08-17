import type { MetadataRoute } from "next";

const fuwuOrange = "#ff6500";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      {
        purpose: "any maskable" as any,
        sizes: "192x192",
        src: "/icons/fuwu-icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any maskable" as any,
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
