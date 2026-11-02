import type { Metadata } from "next";
import AccountRequestsPage from "@/app/account/requests/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Taleplerim | FUWU",
  description: "FUWU hizmet taleplerini ve acil usta çağrılarını takip et.",
};

export default AccountRequestsPage;
