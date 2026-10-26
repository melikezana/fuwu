import { redirect } from "next/navigation";
import { legacyPurchasePath } from "@/lib/commerce/booking";

export const metadata = { title: "Hizmet Satın Al | FUWU" };

// Existing shared links enter commerce; historical records remain in operations.
export default async function RequestPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyPurchasePath(await searchParams));
}
