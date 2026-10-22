import { CustomerHub, type CustomerHubParams } from "@/components/commerce/CustomerHub";
export const dynamic = "force-dynamic";
export const metadata = { title: "Müşteri Paneli | FUWU", robots: { index: false, follow: false } };
export default async function CustomerDashboard({ searchParams }: { searchParams: Promise<CustomerHubParams> }) {
  return <CustomerHub params={await searchParams} />;
}
