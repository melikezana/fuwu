"use client";

import { ChevronDown, Loader2, MessageCircle, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getRequestMessages,
  markRequestMessagesAsRead,
  sendRequestMessage,
  type RequestMessage,
  type RequestMessageSenderRole,
} from "@/services/messaging";

type RequestChatThreadProps = {
  buttonLabel?: string;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  disabledReason?: string;
  initialUnreadCount?: number;
  isEnabled?: boolean;
  requestId: string;
  senderRole: RequestMessageSenderRole;
  title: string;
};

const MAX_MESSAGE_LENGTH = 2000;

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function getMessageTimestamp(message: RequestMessage) {
  return formatMessageTime(message.created_at);
}

function mergeRequestMessages(
  currentMessages: RequestMessage[],
  nextMessage: RequestMessage,
) {
  const nextMessages = [
    ...currentMessages.filter((message) => message.id !== nextMessage.id),
    nextMessage,
  ];

  return nextMessages.sort(
    (firstMessage, secondMessage) =>
      new Date(firstMessage.created_at).getTime() -
        new Date(secondMessage.created_at).getTime() ||
      firstMessage.id.localeCompare(secondMessage.id),
  );
}

export function RequestChatThread({
  buttonLabel,
  className,
  collapsible = true,
  defaultOpen = false,
  disabledReason = "Yazışma bu talep için henüz açılmadı.",
  initialUnreadCount = 0,
  isEnabled = true,
  requestId,
  senderRole,
  title,
}: RequestChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen || !collapsible);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMarkingReadRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const characterCount = draft.length;
  const canSend =
    isEnabled &&
    !isSending &&
    draft.trim().length > 0 &&
    characterCount <= MAX_MESSAGE_LENGTH;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  const markIncomingMessagesRead = useCallback(async () => {
    if (!supabase || !isOpen || isMarkingReadRef.current) {
      return;
    }

    const hasUnreadIncomingMessages =
      unreadCount > 0 ||
      messages.some(
        (message) => message.sender_role !== senderRole && !message.read_at,
      );

    if (!hasUnreadIncomingMessages) {
      return;
    }

    isMarkingReadRef.current = true;
    const readAt = new Date().toISOString();
    const ok = await markRequestMessagesAsRead(requestId, senderRole, supabase);
    isMarkingReadRef.current = false;

    if (!ok) {
      return;
    }

    setUnreadCount(0);
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.sender_role !== senderRole && !message.read_at
          ? { ...message, read_at: readAt }
          : message,
      ),
    );
  }, [isOpen, messages, requestId, senderRole, supabase, unreadCount]);

  const loadMessages = useCallback(async () => {
    if (!supabase || !isEnabled) {
      setHasLoaded(true);
      return;
    }

    const result = await getRequestMessages(requestId, supabase);

    if (!result.success || !result.data) {
      setError(result.error ?? "Mesajlar yüklenemedi.");
      setHasLoaded(true);
      return;
    }

    setMessages(result.data);
    setError(null);
    setHasLoaded(true);
  }, [isEnabled, requestId, supabase]);

  useEffect(() => {
    if (!isOpen || hasLoaded) {
      return;
    }

    const loadTimeoutId = window.setTimeout(() => {
      void loadMessages();
    }, 0);

    return () => window.clearTimeout(loadTimeoutId);
  }, [hasLoaded, isOpen, loadMessages]);

  useEffect(() => {
    if (!supabase || !isEnabled) {
      return;
    }

    const channel = supabase
      .channel(`request_messages:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `request_id=eq.${requestId}`,
          schema: "public",
          table: "request_messages",
        },
        (payload) => {
          const nextMessage = payload.new as RequestMessage;

          if (nextMessage.request_id !== requestId) {
            return;
          }

          if (isOpen || hasLoaded) {
            setMessages((currentMessages) =>
              mergeRequestMessages(currentMessages, nextMessage),
            );
          }

          if (nextMessage.sender_role === senderRole) {
            return;
          }

          if (isOpen) {
            setUnreadCount(0);
            void markRequestMessagesAsRead(requestId, senderRole, supabase);
            return;
          }

          setUnreadCount((currentCount) => currentCount + 1);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hasLoaded, isEnabled, isOpen, requestId, senderRole, supabase]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

    const readTimeoutId = window.setTimeout(() => {
      void markIncomingMessagesRead();
    }, 0);

    return () => window.clearTimeout(readTimeoutId);
  }, [isOpen, markIncomingMessagesRead, messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend || !supabase) {
      return;
    }

    setIsSending(true);
    setError(null);

    const result = await sendRequestMessage(
      {
        message: draft,
        requestId,
        senderRole,
      },
      supabase,
    );

    setIsSending(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "Mesaj gönderilemedi.");
      return;
    }

    setDraft("");
    setMessages((currentMessages) =>
      mergeRequestMessages(currentMessages, result.data as RequestMessage),
    );
    setHasLoaded(true);
  }

  const panel = (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[rgba(10,37,64,0.1)] bg-white shadow-[var(--shadow-subtle)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand-orange-soft)] text-[var(--brand-orange-dark)]">
            <MessageCircle aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-extrabold text-[var(--brand-navy)]">
              {title}
            </h3>
            {unreadCount > 0 ? (
              <p className="mt-0.5 text-xs font-bold text-[var(--brand-orange-dark)]">
                {unreadCount} okunmamış
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {!isEnabled ? (
        <p className="px-4 py-5 text-sm font-semibold leading-6 text-[var(--muted)]">
          {disabledReason}
        </p>
      ) : (
        <>
          <div className="max-h-80 min-h-48 overflow-y-auto bg-[#fffdf9] px-4 py-4">
            {!hasLoaded ? (
              <div className="flex min-h-36 items-center justify-center text-sm font-semibold text-[var(--muted)]">
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                Mesajlar yükleniyor...
              </div>
            ) : messages.length === 0 ? (
              <p className="flex min-h-36 items-center justify-center text-center text-sm font-semibold leading-6 text-[var(--muted)]">
                Henüz mesaj yok.
              </p>
            ) : (
              <div className="grid gap-3">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_role === senderRole;
                  const timestamp = getMessageTimestamp(message);

                  return (
                    <div
                      className={cn(
                        "flex",
                        isOwnMessage ? "justify-end" : "justify-start",
                      )}
                      key={message.id}
                    >
                      <div
                        className={cn(
                          "max-w-[min(82%,34rem)] rounded-lg px-3 py-2 shadow-[var(--shadow-subtle)]",
                          isOwnMessage
                            ? "bg-[var(--brand-orange)] text-white"
                            : "border border-[rgba(10,37,64,0.08)] bg-white text-[var(--brand-navy)]",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6">
                          {message.message}
                        </p>
                        {timestamp ? (
                          <time
                            className={cn(
                              "mt-1 block text-[0.68rem] font-bold leading-4",
                              isOwnMessage
                                ? "text-white/80"
                                : "text-[var(--muted)]",
                            )}
                            dateTime={message.created_at}
                          >
                            {timestamp}
                          </time>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error ? (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <form
            className="border-t border-[var(--border)] bg-white p-3"
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor={`request-message-${requestId}`}>
              Mesaj
            </label>
            <textarea
              className="min-h-24 w-full resize-none rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold leading-6 text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[rgba(255,107,0,0.16)]"
              id={`request-message-${requestId}`}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Mesajını yaz..."
              value={draft}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                className={cn(
                  "text-xs font-bold",
                  characterCount > MAX_MESSAGE_LENGTH
                    ? "text-red-700"
                    : "text-[var(--muted)]",
                )}
              >
                {characterCount}/{MAX_MESSAGE_LENGTH}
              </span>
              <button
                className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[var(--brand-orange)] px-4 text-sm font-extrabold text-white shadow-[var(--shadow-action)] transition-colors hover:bg-[var(--brand-orange-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSend}
                type="submit"
              >
                {isSending ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Send aria-hidden className="size-4" />
                )}
                Gönder
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );

  if (!collapsible) {
    return panel;
  }

  return (
    <div className="mt-3">
      <button
        aria-expanded={isOpen}
        className="inline-flex min-h-10 max-w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[rgba(255,107,0,0.34)] bg-[var(--brand-orange-soft)] px-3 text-sm font-extrabold text-[var(--brand-navy)] transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!isEnabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <MessageCircle aria-hidden className="size-4 text-[var(--brand-orange-dark)]" />
        <span className="truncate">{buttonLabel ?? title}</span>
        {unreadCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-orange)] px-1.5 text-[0.68rem] font-medium leading-5 text-white">
            {badgeLabel}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>
      {!isEnabled ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--muted)]">
          {disabledReason}
        </p>
      ) : null}
      {isOpen ? <div className="mt-3">{panel}</div> : null}
    </div>
  );
}
