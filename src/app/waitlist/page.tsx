import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/constants/navigation";

export const metadata: Metadata = {
  title: "Hizmeti Satın Al",
  description: "Fuwu’da ihtiyacını belirle, konumunu belirt ve uygun ustaya ulaşmak için talep oluştur.",
};

export default function WaitlistPage() {
  redirect(appRoutes.request);
}
