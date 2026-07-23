"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface UndoConsentModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  rejectLabel?: string;
  onConfirm: () => void;
  onReject: () => void;
  waiting?: boolean;
}

export function UndoConsentModal({
  open,
  title,
  message,
  confirmLabel = "동의",
  rejectLabel = "거절",
  onConfirm,
  onReject,
  waiting = false,
}: UndoConsentModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="undo-consent-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="undo-consent-title"
          className="text-lg font-semibold text-stone-900"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-600">{message}</p>
        {waiting ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onReject}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              요청 취소
            </button>
          </div>
        ) : (
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onReject}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              {rejectLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
