import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { HelpButton } from "@/components/layout/HelpButton";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { LocaleProvider } from "@/lib/i18n";
import { createPageMetadata, seoConfig } from "@/lib/seo";
import "@/styles/globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin", "latin-ext"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" dir="ltr" lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased`}
      >
        <LocaleProvider>
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <HelpButton />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
