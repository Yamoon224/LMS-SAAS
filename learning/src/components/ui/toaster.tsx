"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useCopy } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Mini store de toasts (pattern Sonner) : `toast.success("…")` utilisable partout côté client. */
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  items = [...items.slice(-2), { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), kind === "error" ? 6000 : 4000);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

const EMPTY: ToastItem[] = [];

export function Toaster() {
  const copy = useCopy();
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
    () => EMPTY,
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[84px] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {current.map((item) => (
        <div
          key={item.id}
          role={item.kind === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-md border bg-card p-3 text-sm shadow-lift",
            item.kind === "error" ? "border-red-200" : "border-line",
          )}
        >
          {item.kind === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 break-words text-ink">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label={copy.common.close}
            className="-m-2 flex h-[44px] w-[44px] items-center justify-center rounded-lg text-subtle hover:bg-ink/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
