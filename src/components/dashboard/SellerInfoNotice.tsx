import Link from "next/link";
import { FileWarning } from "lucide-react";

/** Satıcı (usta) kimliği eksikse hizmetler satışta görünmez; ustaya ne eksik olduğunu ve nereden tamamlayacağını söyler. */
export function SellerInfoNotice({ legalName, taxIdentityNumber, payoutAddress, phone }: { legalName?: string; taxIdentityNumber?: string; payoutAddress?: string; phone?: string }) {
  const missing = [
    (legalName?.trim().length ?? 0) < 3 && "yasal ad",
    !/^\d{10,11}$/.test(taxIdentityNumber ?? "") && "T.C. kimlik / vergi no",
    (payoutAddress?.trim().length ?? 0) < 5 && "açık adres",
    (phone?.replace(/\D/g, "").length ?? 0) < 10 && "telefon",
  ].filter(Boolean) as string[];
  if (!missing.length) return null;
  return <section className="commerce-panel" role="status" aria-labelledby="seller-info-title"><h2 id="seller-info-title"><FileWarning size={20} aria-hidden /> Satışa açılmak için satıcı bilgilerin eksik</h2><p className="commerce-help">Müşteri, siparişten önce ön bilgilendirme formunda hizmeti sunanın kimlik ve iletişim bilgilerini görmek zorunda. Eksik: {missing.join(", ")}. Bu bilgiler tamamlanana kadar hizmetlerin satışta görünmez.</p><Link className="commerce-button" href="/provider-dashboard/payment-info">Satıcı Bilgilerini Tamamla</Link></section>;
}
