import { getServiceForValue } from "@/lib/constants/services";

export function legacyPurchasePath(params: Record<string, string | string[] | undefined>) {
  const value = (key: string) => {
    const entry = params[key];
    return (Array.isArray(entry) ? entry[0] : entry) || "";
  };
  const provider = value("provider_id");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(provider)) {
    return `/providers/${provider}#provider-services`;
  }
  const category = getServiceForValue(value("service") || value("match_service"));
  const district = value("district") || value("match_district");
  const query = new URLSearchParams();
  if (category) query.set("category", category.slug);
  if (district) query.set("district", district);
  return `/services${query.size ? `?${query}` : ""}`;
}

export function bookingDays(today: string, count = 7) {
  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(`${today}T12:00:00+03:00`);
    day.setUTCDate(day.getUTCDate() + offset);
    return {
      iso: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(day),
      label: offset === 0 ? "Bugün" : offset === 1 ? "Yarın" : new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "Europe/Istanbul" }).format(day),
      date: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(day),
    };
  });
}
