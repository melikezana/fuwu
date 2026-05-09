import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appRoutes } from "@/constants/navigation";

export const metadata: Metadata = {
  title: "Talep Oluştur | Fuwu",
  description: "Fuwu’da ihtiyacını belirle, konumunu belirt ve uygun ustaya ulaşmak için talep oluştur.",
};

export default function WaitlistPage() {
  redirect(appRoutes.request);
}
