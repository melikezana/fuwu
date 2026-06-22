"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmPaymentByCustomerAction } from "@/app/account/requests/actions";
import { Button } from "@/components/ui/Button";
import {
  PAYMENT_PREFERENCES,
  PAYMENT_STATUSES,
  type PaymentStatus,
  type ServiceRequestPaymentPreference,
} from "@/services/payments";

type PaymentConfirmationButtonProps = {
  paymentMethod: ServiceRequestPaymentPreference;
  requestId: string;
  status: PaymentStatus;
};

function getConfirmationLabel(method: ServiceRequestPaymentPreference) {
  if (method === PAYMENT_PREFERENCES.iban) {
    return "IBAN transferini onayladım";
  }

  if (method === PAYMENT_PREFERENCES.onlineSoon) {
    return "Online ödemeyi onayladım";
  }

  return "Nakit ödemeyi onayladım";
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

  function handleConfirm() {
    setMessage(null);

    startTransition(async () => {
      const result = await confirmPaymentByCustomerAction(requestId);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setIsConfirmed(true);
      router.refresh();
    });
  }

  return (
    <div>
      <Button
        className={
          isConfirmed
            ? "w-full bg-[var(--trust-green)] text-white hover:bg-[var(--trust-green)] sm:w-fit"
            : "w-full bg-[var(--trust-green)] text-white hover:bg-[var(--trust-green)] sm:w-fit"
        }
        disabled={isPending || isConfirmed}
        onClick={handleConfirm}
        type="button"
      >
        <CheckCircle2 aria-hidden="true" className="mr-2 size-4" />
        {isConfirmed
          ? "✓ Ödeme Onaylandı"
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
