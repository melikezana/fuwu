const steps = ["Hizmet", "Paket ve usta", "Gün / Saat", "Adres", "Onay"];

/** Satın alma adımları. Kartla ödemede son adım "Ödeme" eklenir; kapıda ödemede sipariş onayla biter. */
export function BookingProgress({ current, withPayment = false }: { current: number; withPayment?: boolean }) {
  return <nav aria-label="Satın alma adımları" className="fusion-booking-progress"><ol>
    {[...steps, ...(withPayment ? ["Ödeme"] : [])].map((label, index) => <li key={label} aria-current={index === current ? "step" : undefined} className={index < current ? "is-done" : ""}><span>{index + 1}</span>{label}</li>)}
  </ol></nav>;
}
