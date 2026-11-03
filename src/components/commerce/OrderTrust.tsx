import { BadgeCheck, CircleDashed, ShieldCheck } from "lucide-react";

export type OrderTrustData = {
  customer?: { email_verified?: boolean; phone_verified?: boolean; completed_orders?: number; member_since?: string | null };
  provider?: { identity_verified?: boolean; phone_verified?: boolean; qualification_verified?: boolean };
};

const memberSince = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-15T00:00:00Z`));
};

function TrustItem({ ok, label, missing }: { ok: boolean; label: string; missing: string }) {
  return <li className={ok ? "is-ok" : "is-missing"}>{ok ? <BadgeCheck size={18} aria-hidden /> : <CircleDashed size={18} aria-hidden />}<span>{ok ? label : missing}</span></li>;
}

/** Sipariş tarafları birbirinin doğrulama durumunu görür; iletişim bilgisi paylaşılmaz. */
export function OrderTrust({ trust, isProvider }: { trust: OrderTrustData; isProvider: boolean }) {
  const customer = trust.customer ?? {};
  const provider = trust.provider ?? {};
  const since = memberSince(customer.member_since);
  const completed = Number(customer.completed_orders ?? 0);
  return <section className="commerce-panel order-trust" aria-labelledby="order-trust-title">
    <h2 id="order-trust-title"><ShieldCheck size={22} aria-hidden /> Karşılıklı doğrulama</h2>
    <p className="commerce-help">FUWU&apos;da iki taraf da doğrulanır. Burada yalnızca doğrulama durumu görünür; telefon ve e-posta paylaşılmaz.</p>
    <div className="order-trust-grid">
      <div>
        <h3>{isProvider ? "Sen" : "Usta"}</h3>
        <ul>
          <TrustItem ok={Boolean(provider.identity_verified)} label="Kimlik belgesi doğrulandı" missing="Kimlik doğrulaması yok" />
          <TrustItem ok={Boolean(provider.phone_verified)} label="Telefon doğrulandı" missing="Telefon doğrulaması yok" />
          <TrustItem ok={Boolean(provider.qualification_verified)} label="Mesleki belge doğrulandı" missing="Mesleki belge doğrulaması yok" />
        </ul>
      </div>
      <div>
        <h3>{isProvider ? "Müşteri" : "Sen"}</h3>
        <ul>
          <TrustItem ok={Boolean(customer.phone_verified)} label="Telefon doğrulandı" missing="Telefon doğrulanmadı" />
          <TrustItem ok={Boolean(customer.email_verified)} label="E-posta doğrulandı" missing="E-posta doğrulanmadı" />
        </ul>
        <p className="commerce-help">{completed > 0 ? `${completed} tamamlanan hizmet` : "İlk sipariş"}{since ? ` · Üyelik: ${since}` : ""}</p>
      </div>
    </div>
  </section>;
}
