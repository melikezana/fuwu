// Randevuyu takvime ekleme (.ics) ve yol tarifi bağlantısı. Saf fonksiyonlar; test edilebilir.
type CalendarOrder = { id: string; service_name: string; provider_name: string; district_name: string; address?: string | null; starts_at: string; ends_at: string };

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
// RFC 5545: virgül, noktalı virgül, ters bölü ve satır sonu kaçışlanır.
const text = (value: string) => value.replace(/\\/g, "\\\\").replace(/[;,]/g, match => `\\${match}`).replace(/\r?\n/g, "\\n");
// Satırlar 75 oktette katlanır; çok baytlı Türkçe karakterler bölünmez.
function fold(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (encoder.encode(current + char).length > (parts.length ? 74 : 75)) { parts.push(current); current = ""; }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildOrderIcs(order: CalendarOrder, siteUrl: string, now = new Date()) {
  const url = new URL(`/orders/${order.id}`, siteUrl).toString();
  const location = [order.address, order.district_name, "İstanbul"].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FUWU//Randevu//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${order.id}@fuwu.com.tr`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(order.starts_at)}`,
    `DTEND:${stamp(order.ends_at)}`,
    `SUMMARY:${text(`FUWU · ${order.service_name}`)}`,
    `DESCRIPTION:${text(`Usta: ${order.provider_name}\nSipariş: ${url}\nTeslim kodunu iş bitmeden paylaşma.`)}`,
    `LOCATION:${text(location)}`,
    `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT1H", `DESCRIPTION:${text(`FUWU randevun 1 saat sonra: ${order.service_name}`)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function directionsUrl(order: Pick<CalendarOrder, "address" | "district_name">) {
  const destination = [order.address, order.district_name, "İstanbul"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
