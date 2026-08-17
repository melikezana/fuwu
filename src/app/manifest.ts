import type { MetadataRoute } from "next";

const fuwuOrange = "#ff6500";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/icons/fuwu-icon-192.svg",
        type: "image/svg+xml",
      },
      {
        sizes: "512x512",
        src: "/icons/fuwu-icon-512.svg",
        type: "image/svg+xml",
      },
    ],
    name: "FUWU - Ev Hizmetleri",
    short_name: "FUWU",
    start_url: "/",
    theme_color: fuwuOrange,
  };
}
