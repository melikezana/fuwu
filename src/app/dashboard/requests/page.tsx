import type { Metadata } from "next";
import AccountRequestsPage from "@/app/account/requests/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Taleplerim | Fuwu",
  description: "Fuwu hizmet taleplerini ve acil usta çağrılarını takip et.",
};

export default AccountRequestsPage;
