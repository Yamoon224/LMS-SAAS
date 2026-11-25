"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/**
 * Notifications (toasts) sans dépendance : store module + <Toaster /> monté une fois dans
 * Providers. Utilisable hors composants (callbacks de mutation TanStack Query) :
 *   toast.success("Formation créée");  toast.error(error);
 */
type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

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

function push(kind: ToastKind, message: string, durationMs: number) {
  const id = nextId++;
  items = [...items.slice(-3), { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), durationMs);
}

/** Extrait un message lisible d'une erreur inconnue (ApiError, Error, texte). */
function messageOf(input: unknown, fallback: string): string {
  if (typeof input === "string") return input;
  if (input instanceof Error && input.message) return input.message;
  return fallback;
}

export const toast = {
  success: (message: string) => push("success", message, 4000),
  info: (message: string) => push("info", message, 4000),
  error: (input: unknown, fallback = "Une erreur est survenue.") =>
    push("error", messageOf(input, fallback), 7000),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: ToastItem[] = [];

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const TONES = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
} as const;

export function Toaster() {
  const current = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {current.map((item) => {
        const Icon = ICONS[item.kind];
        return (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-border bg-surface p-3 pr-2 text-sm shadow-pop animate-pop-in"
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONES[item.kind])} aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
