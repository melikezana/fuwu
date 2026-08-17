import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Wrench } from "lucide-react";
import { MetaPixelScript } from "@/components/analytics/MetaPixelScript";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { HelpButton } from "@/components/layout/HelpButton";
import { Footer } from "@/components/layout/Footer";
import { MobileAppShell } from "@/components/layout/MobileAppShell";
import { Navbar } from "@/components/layout/Navbar";
import { LocaleProvider } from "@/lib/i18n";
import { createPageMetadata, seoConfig } from "@/lib/seo";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";
import { getPublicAppSettings } from "@/services/admin/settings";
import "@/styles/globals.css";

const inter = localFont({
  display: "swap",
  src: [
    {
      path: "../fonts/Inter-Regular.woff2",
      style: "normal",
      weight: "400",
    },
    {
      path: "../fonts/Inter-Medium.woff2",
      style: "normal",
      weight: "500",
    },
    {
      path: "../fonts/Inter-SemiBold.woff2",
      style: "normal",
      weight: "600",
    },
    {
      path: "../fonts/Inter-Bold.woff2",
      style: "normal",
      weight: "700",
    },
    {
      path: "../fonts/Inter-ExtraBold.woff2",
      style: "normal",
      weight: "800",
    },
  ],
  variable: "--font-inter",
});

const fuwuThemeColor = "#ff6500";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    path: "/",
  }),
  metadataBase: new URL(seoConfig.siteUrl),
  title: {
    default: seoConfig.defaultTitle,
    template: seoConfig.titleTemplate,
  },
  applicationName: seoConfig.legalName,
  authors: [{ name: seoConfig.siteName, url: seoConfig.siteUrl }],
  creator: seoConfig.legalName,
  publisher: seoConfig.siteName,
  formatDetection: {
    telephone: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FUWU",
  },
  icons: {
    apple: [
      {
        sizes: "192x192",
        type: "image/svg+xml",
        url: "/icons/fuwu-icon-192.svg",
      },
    ],
    icon: [
      {
        sizes: "192x192",
        type: "image/svg+xml",
        url: "/icons/fuwu-icon-192.svg",
      },
      {
        sizes: "512x512",
        type: "image/svg+xml",
        url: "/icons/fuwu-icon-512.svg",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: fuwuThemeColor,
  viewportFit: "cover",
  width: "device-width",
};

const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { announcementBanner, maintenanceMode } = await getPublicAppSettings();

  return (
    <html data-scroll-behavior="smooth" dir="ltr" lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased`}
      >
        <MetaPixelScript
          enabled={analyticsEnabled}
          nonce={nonce}
          pixelId={metaPixelId}
        />
        <LocaleProvider>
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          <MobileAppShell>
            {maintenanceMode ? (
              <div className="w-full bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
                <span className="inline-flex items-center gap-2">
                  <Wrench className="h-4 w-4 shrink-0" aria-hidden />
                  Site şu anda bakım modunda.
                </span>
              </div>
            ) : null}
            <AnnouncementBanner message={announcementBanner} />
            <Navbar />
            <main className="premium-reveal flex-1">{children}</main>
            <Footer />
            <HelpButton />
          </MobileAppShell>
          <Suspense fallback={null}>
            <CookieConsentBanner />
          </Suspense>
        </LocaleProvider>
      </body>
    </html>
  );
}
