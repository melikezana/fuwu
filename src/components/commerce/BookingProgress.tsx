export function BookingProgress({ current }: { current: number }) {
  return <nav aria-label="Satın alma adımları" className="fusion-booking-progress"><ol>
    {["Hizmet", "Usta", "Gün / Saat", "Adres", "Sipariş Özeti", "Ödeme"].map((label, index) => <li key={label} aria-current={index === current ? "step" : undefined} className={index < current ? "is-done" : ""}><span>{index + 1}</span>{label}</li>)}
  </ol></nav>;
}
