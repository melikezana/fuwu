import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { Wrench } from "lucide-react";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { HelpButton } from "@/components/layout/HelpButton";
import { Footer } from "@/components/layout/Footer";
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
};

const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

function serializeForInlineScript(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

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
        {analyticsEnabled && metaPixelId ? (
          <Script
            dangerouslySetInnerHTML={{
              __html: `
(function() {
  var pixelId = ${serializeForInlineScript(metaPixelId)};
  var consentKey = "fuwu:cookie-consent";
  var initialized = false;

  function hasConsent() {
    try {
      return window.localStorage.getItem(consentKey) === "accepted";
    } catch (error) {
      return false;
    }
  }

  function initMetaPixel() {
    if (initialized || !pixelId || !hasConsent()) return;
    initialized = true;

    !function(f,b,e,v,n,t,s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }

  initMetaPixel();
  window.addEventListener("fuwuConsentChanged", initMetaPixel);
})();
`,
            }}
            id="meta-pixel"
            nonce={nonce}
            strategy="afterInteractive"
          />
        ) : null}
        <LocaleProvider>
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          <div className="flex min-h-screen flex-col">
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
          </div>
          <Suspense fallback={null}>
            <CookieConsentBanner />
          </Suspense>
        </LocaleProvider>
      </body>
    </html>
  );
}
