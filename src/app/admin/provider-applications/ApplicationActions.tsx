"use client";

import type { FormEvent } from "react";
import {
  AdminActionButton,
  adminActionIcons,
} from "@/components/admin/AdminUI";
import { PROVIDER_APPLICATION_STATUSES } from "@/lib/constants/statuses";

type ApplicationAction = (formData: FormData) => Promise<void> | void;

type ApplicationActionsProps = {
  applicationId: string;
  applicationName: string;
  approveAction: ApplicationAction;
  phone: string;
  rejectAction: ApplicationAction;
  returnStatus?: string | null;
  status: string;
};

function getWhatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits || digits.length < 10) {
    return null;
  }

  const message = encodeURIComponent(
    "Merhaba, Fuwu usta başvurunuz hakkında iletişime geçiyorum.",
  );

  return `https://wa.me/${digits}?text=${message}`;
}

function getFallbackMessageHref() {
  const subject = encodeURIComponent("Fuwu usta başvurusu");
  const body = encodeURIComponent(
    "Başvuru sahibi için e-posta/mesaj kanalı eklendiğinde buradan iletişim kurulacak.",
  );

  return `mailto:?subject=${subject}&body=${body}`;
}

function confirmSubmit(event: FormEvent<HTMLFormElement>, message: string) {
  if (!window.confirm(message)) {
    event.preventDefault();
  }
}

export function ApplicationActions({
  applicationId,
  applicationName,
  approveAction,
  phone,
  rejectAction,
  returnStatus,
  status,
}: ApplicationActionsProps) {
  const isPending = status === PROVIDER_APPLICATION_STATUSES.pending;
  const isApproved = status === PROVIDER_APPLICATION_STATUSES.approved;
  const isRejected = status === PROVIDER_APPLICATION_STATUSES.rejected;
  const whatsappHref = getWhatsappHref(phone);
  const messageHref = whatsappHref ?? getFallbackMessageHref();
  const MessageIcon = adminActionIcons.message;

  return (
    <div className="flex max-w-full flex-wrap gap-2">
      <form
        action={approveAction}
        className="min-w-0 flex-1 sm:flex-none"
        onSubmit={(event) =>
          confirmSubmit(
            event,
            `${applicationName} başvurusunu onaylamak üzeresin. Usta profili oluşturulur veya mevcut profil güncellenir. Devam edilsin mi?`,
          )
        }
      >
        <input name="applicationId" type="hidden" value={applicationId} />
        {returnStatus ? (
          <input name="returnStatus" type="hidden" value={returnStatus} />
        ) : null}
        <AdminActionButton
          disabled={!isPending}
          icon={adminActionIcons.approve}
          title={
            isPending
              ? "Başvuruyu onayla"
              : "Yalnızca bekleyen başvurular onaylanır"
          }
          tone="approve"
          type="submit"
        >
          Onayla
        </AdminActionButton>
      </form>
      <form
        action={rejectAction}
        className="min-w-0 flex-1 sm:flex-none"
        onSubmit={(event) =>
          confirmSubmit(
            event,
            `${applicationName} başvurusunu reddetmek üzeresin. Veri silinmez; durum reddedildi olarak saklanır. Devam edilsin mi?`,
          )
        }
      >
        <input name="applicationId" type="hidden" value={applicationId} />
        {returnStatus ? (
          <input name="returnStatus" type="hidden" value={returnStatus} />
        ) : null}
        <AdminActionButton
          disabled={!isPending}
          icon={adminActionIcons.reject}
          title={
            isPending
              ? "Başvuruyu reddet"
              : isApproved
                ? "Onaylanmış başvuru bu ekrandan reddedilemez"
                : isRejected
                  ? "Başvuru zaten reddedildi"
                  : "Yalnızca bekleyen başvurular reddedilir"
          }
          tone="reject"
          type="submit"
        >
          Reddet
        </AdminActionButton>
      </form>
      <a
        className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-[rgba(255,138,0,0.35)] bg-white px-3 py-2 text-center text-xs font-bold leading-4 text-[var(--brand-navy)] transition-colors hover:border-[rgba(255,138,0,0.55)] hover:bg-[var(--brand-orange-soft)] sm:flex-none"
        href={messageHref}
        rel={whatsappHref ? "noreferrer" : undefined}
        target={whatsappHref ? "_blank" : undefined}
        title={
          whatsappHref
            ? "WhatsApp üzerinden mesaj gönder"
            : "Telefon yok; e-posta/mesaj taslağı aç"
        }
      >
        <MessageIcon className="h-4 w-4" aria-hidden />
        Mesaj Gönder
      </a>
    </div>
  );
}
