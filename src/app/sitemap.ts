import type { MetadataRoute } from "next";
import { appRoutes } from "@/lib/constants/navigation";
import { services } from "@/lib/constants/services";
import { createAbsoluteUrl } from "@/lib/seo";
import { getProviderDirectory } from "@/services/providers";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const providerDirectory = await getProviderDirectory();
  const staticRoutes = [
    { path: appRoutes.home, priority: 1 },
    { path: appRoutes.providers, priority: 0.95 },
    { path: appRoutes.request, priority: 0.7 },
    { path: appRoutes.providerApplication, priority: 0.65 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: createAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
  const categoryEntries: MetadataRoute.Sitemap = services.map((service) => ({
    url: createAbsoluteUrl(service.href),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));
  const providerEntries: MetadataRoute.Sitemap = providerDirectory.allProviders.map((provider) => ({
    url: createAbsoluteUrl(`${appRoutes.providers}/${provider.id}`),
    lastModified,
    changeFrequency: "weekly",
    priority: provider.featured ? 0.8 : 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...providerEntries];
}
