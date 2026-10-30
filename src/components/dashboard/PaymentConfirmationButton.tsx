import type { PaymentStatus, ServiceRequestPaymentPreference } from "@/services/payments/constants";
// Legacy request codes never authorize a FUWU Güvence arrival/completion or live funds.
export function PaymentConfirmationButton({ requestId }: { paymentMethod: ServiceRequestPaymentPreference; requestId: string; status: PaymentStatus }) {
 return <p id={`payment-${requestId}`} className="commerce-notice">Online satın alma ve ödeme onayı henüz açılmadı. Talep referansı kapı doğrulaması veya hizmet onayı yerine geçmez.</p>;
}
