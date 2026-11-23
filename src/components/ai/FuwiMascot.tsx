import { cn } from "@/lib/utils";

/**
 * Fuwi: FUWU'nun yapay zekâ ev asistanının maskotu.
 *
 * Çatılı bir ev biçimi (FUWU = evin işi) + iki göz + küçük gülümseme + çatıda yapay zekâyı anlatan
 * bir kıvılcım. İnsan yüzü taklit etmez; bir yapay zekâ olduğu ilk bakışta anlaşılır. 20 px'te bile
 * okunur. Renkler yalnızca marka değişkenlerinden gelir.
 */
export function FuwiMascot({ className, title = "Fuwi", decorative = false }: { className?: string; title?: string; decorative?: boolean }) {
  return (
    <svg
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      className={cn("fuwi-mascot", className)}
      fill="none"
      role={decorative ? undefined : "img"}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gövde: yuvarlatılmış çatılı ev */}
      <path
        d="M29.6 6.9a4 4 0 0 1 4.8 0l19.4 14.6A6 6 0 0 1 56.2 26.3V49a9 9 0 0 1-9 9H16.8a9 9 0 0 1-9-9V26.3a6 6 0 0 1 2.4-4.8L29.6 6.9Z"
        fill="var(--brand-orange)"
      />
      {/* Yüz paneli */}
      <rect x="15" y="27" width="34" height="23" rx="11.5" fill="#fff" />
      {/* Gözler */}
      <ellipse className="fuwi-eye" cx="25" cy="37" rx="3.2" ry="3.8" fill="var(--brand-navy)" />
      <ellipse className="fuwi-eye" cx="39" cy="37" rx="3.2" ry="3.8" fill="var(--brand-navy)" />
      <circle cx="26.1" cy="35.6" r="1" fill="#fff" />
      <circle cx="40.1" cy="35.6" r="1" fill="#fff" />
      {/* Gülümseme */}
      <path d="M28 43.2c2.3 2.1 5.7 2.1 8 0" stroke="var(--brand-navy)" strokeLinecap="round" strokeWidth="2.4" />
      {/* Yapay zekâ kıvılcımı */}
      <path className="fuwi-spark" d="M47.5 6.5l1.5 3.6 3.6 1.5-3.6 1.5-1.5 3.6-1.5-3.6-3.6-1.5 3.6-1.5 1.5-3.6Z" fill="var(--brand-navy)" />
    </svg>
  );
}

export const FUWI_NAME = "Fuwi";
export const FUWI_TAGLINE = "FUWU'nun yapay zekâ ev asistanı";
