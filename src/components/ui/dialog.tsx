"use client";

import { X } from "lucide-react";
import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DialogProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
};

export function Dialog({
  children,
  className,
  description,
  isOpen,
  onClose,
  title,
}: DialogProps) {
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0);
    (focusable()[0] || panel.current)?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!isDragging.current || touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // Only allow downward drag
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  }

  function handleTouchEnd() {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Threshold to close: 75px downward drag
    if (dragY > 75) {
      onClose();
    }
    setDragY(0);
    touchStartY.current = null;
  }

  return (
    <div className="fuwu-dialog fixed inset-0 z-[70] flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[rgba(10,37,64,0.45)] backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet Container */}
      <div
        ref={panel}
        tabIndex={-1}
        aria-label={title ? undefined : "İşlem penceresi"}
        aria-describedby={description ? `${dialogId}-description` : undefined}
        aria-labelledby={title ? `${dialogId}-title` : undefined}
        aria-modal="true"
        className={cn(
          "relative z-50 w-full bg-white shadow-2xl transition-transform duration-250 ease-out",
          // Mobile: Bottom sheet
          "fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl p-5 pb-[max(1.25rem,var(--safe-bottom))]",
          // Desktop: Centered modal
          "md:static md:inset-auto md:max-w-lg md:rounded-xl md:p-6",
          className,
        )}
        onPointerDown={(e) => e.stopPropagation()}
        role="dialog"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        }}
      >
        {/* Mobile visual drag handle */}
        <div
          aria-hidden="true"
          className="mx-auto -mt-1 mb-4 h-4 w-10 cursor-grab rounded-full bg-gray-300 active:cursor-grabbing md:hidden"
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2
                className="text-lg font-extrabold text-[var(--brand-navy)]"
                id={`${dialogId}-title`}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                className="mt-1 text-xs font-semibold text-[var(--muted)]"
                id={`${dialogId}-description`}
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Kapat"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
