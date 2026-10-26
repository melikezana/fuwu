import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/constants/navigation";

export const metadata: Metadata = {
  title: "Hizmeti Satın Al",
  description: "FUWU’da hizmetini seç, ustanı incele ve sana uygun gün ve saat için randevu planla.",
};

export default function WaitlistPage() {
  redirect(appRoutes.request);
}
