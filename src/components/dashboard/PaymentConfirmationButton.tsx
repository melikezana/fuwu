"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmPaymentByCustomerAction } from "@/app/account/requests/actions";
import { Button } from "@/components/ui/Button";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { cn } from "@/lib/utils";
import { trackMetaPurchase } from "@/services/analytics";
import {
  PAYMENT_PREFERENCES,
  PAYMENT_STATUSES,
  type PaymentStatus,
  type ServiceRequestPaymentPreference,
} from "@/services/payments/constants";

type PaymentConfirmationButtonProps = {
  paymentMethod: ServiceRequestPaymentPreference;
  requestId: string;
  status: PaymentStatus;
};

function getConfirmationLabel(method: ServiceRequestPaymentPreference) {
  if (method === PAYMENT_PREFERENCES.iban) {
    return "Kodu doğrula ve transferi onayla";
  }

  if (method === PAYMENT_PREFERENCES.onlineSoon) {
    return "Kodu doğrula ve ödemeyi serbest bırak";
  }

  return "Kodu doğrula ve ödemeyi onayla";
}

export function PaymentConfirmationButton({
  paymentMethod,
  requestId,
  status,
}: PaymentConfirmationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmed, setIsConfirmed] = useState(
    status === PAYMENT_STATUSES.confirmed,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const normalizedVerificationCode = verificationCode.replace(/\D/g, "").slice(0, 6);
  const canSubmitCode = normalizedVerificationCode.length === 6;

  const isKeyboardOpen = useKeyboardOpen();

  function handleConfirm() {
    setMessage(null);

    if (!canSubmitCode) {
      setMessage("6 haneli müşteri doğrulama kodunu gir.");
      return;
    }

    startTransition(async () => {
      const result = await confirmPaymentByCustomerAction(
        requestId,
        normalizedVerificationCode,
      );

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setIsConfirmed(true);
      setVerificationCode("");
      trackMetaPurchase({
        currency: result.currency,
        value: result.amount,
      });
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "mobile-sticky-action fixed bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom))] left-0 right-0 z-40 bg-white p-4 border-t border-[var(--border)] shadow-[var(--shadow-elevated)] md:static md:bottom-auto md:z-auto md:max-w-md md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none",
        isKeyboardOpen && "static bottom-auto shadow-none",
      )}
    >
      {!isConfirmed ? (
        <div className="mb-3">
          <label
            className="block text-xs font-bold uppercase tracking-normal text-[var(--muted)]"
            htmlFor={`verification-code-${requestId}`}
          >
            Müşteri doğrulama kodu
          </label>
          <div className="relative mt-2">
            <ShieldCheck
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--trust-green)]"
            />
            <input
              autoComplete="one-time-code"
              className="premium-control min-h-12 w-full pl-10 pr-4 text-center font-mono text-lg font-extrabold tracking-[0.24em] text-[var(--brand-navy)] outline-none"
              id={`verification-code-${requestId}`}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              pattern="[0-9]*"
              placeholder="000000"
              type="text"
              value={normalizedVerificationCode}
            />
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--muted)]">
            Kod yalnızca müşteri hesabında görünür. Hatalı kodda ödeme emanet hesapta kalır.
          </p>
        </div>
      ) : null}
      <Button
        className={
          isConfirmed
            ? "w-full bg-[var(--trust-green)] text-white hover:bg-[var(--trust-green)] sm:w-fit"
            : "w-full bg-[var(--trust-green)] text-white hover:bg-[var(--trust-green)] sm:w-fit"
        }
        disabled={isPending || isConfirmed || !canSubmitCode}
        onClick={handleConfirm}
        type="button"
      >
        <CheckCircle2 aria-hidden="true" className="mr-2 size-4" />
        {isConfirmed
          ? "Ödeme Onaylandı"
          : isPending
            ? "Onaylanıyor"
            : getConfirmationLabel(paymentMethod)}
      </Button>
      {message ? (
        <p
          className="mt-2 text-sm font-bold text-[var(--brand-orange-dark)]"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
