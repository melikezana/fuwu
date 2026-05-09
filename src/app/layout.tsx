import type { Metadata } from "next";
import { HelpButton } from "@/components/layout/HelpButton";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fuwu | Ustaya Ulaşmanın En Hızlı Yolu",
  description:
    "İhtiyacını belirle, ustaları karşılaştır, ortalama fiyat aralıklarını gör ve telefon ya da WhatsApp ile doğrudan iletişime geç.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="tr">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <HelpButton />
        </div>
      </body>
    </html>
  );
}
