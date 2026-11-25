"use client";

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { useState } from "react";

import { payEnrollment } from "../api/payments.api";
import type { PaymentMethod } from "../schemas/payment.schema";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { OfflineInstructionsBox } from "@/features/tenant/components/OfflineInstructions";
import { ApiError } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";
import { safeUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export function paymentErrorMessage(error: unknown, copy: Copy): string {
  if (error instanceof ApiError) {
    if (error.code === "MOYEN_PAIEMENT_INDISPONIBLE") return copy.payment.methodUnavailable;
    if (error.code === "INSCRIPTION_NON_PAYABLE") return copy.payment.notPayable;
  }
  return error instanceof Error && error.message ? error.message : copy.errors.generic;
}

export const OFFLINE = "OFFLINE" as const;
export type PaymentChoiceValue = PaymentMethod | typeof OFFLINE;

interface MethodPickerProps {
  methods: PaymentMethod[];
  value: PaymentChoiceValue | null;
  onChange: (value: PaymentChoiceValue) => void;
  allowOffline: boolean;
  disabled?: boolean;
}

/** Sélecteur de moyen de paiement (radios natifs : clavier OK, cibles >= 56px). */
export function PaymentMethodPicker({ methods, value, onChange, allowOffline, disabled }: MethodPickerProps) {
  const copy = useCopy();
  const options: { value: PaymentChoiceValue; label: string; help?: string; icon: typeof CreditCard }[] = [
    ...methods.map((method) => ({
      value: method as PaymentChoiceValue,
      label: copy.payment.methods[method] ?? method,
      icon: method === "CARD" ? CreditCard : Smartphone,
    })),
    ...(allowOffline ? [{ value: OFFLINE, label: copy.enroll.offline, help: copy.enroll.offlineHelp, icon: Banknote }] : []),
  ];

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">{copy.enroll.paymentMethod}</legend>
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <label
            key={option.value}
            className={cn(
              "flex min-h-[56px] cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary",
              selected ? "border-primary bg-primary/5" : "border-line bg-card hover:bg-canvas",
            )}
          >
            <input
              type="radio"
              name="payment-method"
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-sm font-medium">{option.label}</span>
              {option.help && <span className="mt-0.5 block text-xs text-subtle">{option.help}</span>}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 h-4 w-4 shrink-0 rounded-full border-2",
                selected ? "border-primary bg-primary shadow-[inset_0_0_0_3px_rgb(var(--card))]" : "border-line",
              )}
            />
          </label>
        );
      })}
    </fieldset>
  );
}

/** Lance le paiement et redirige vers le prestataire (ou affiche les instructions asynchrones). */
export function usePayAction(onAsyncStarted?: () => void) {
  const copy = useCopy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asyncStarted, setAsyncStarted] = useState(false);

  async function pay(enrollmentId: string, method: PaymentMethod) {
    setPending(true);
    setError(null);
    try {
      const result = await payEnrollment(enrollmentId, method);
      const url = safeUrl(result.checkoutUrl);
      if (url) {
        window.location.assign(url);
        return;
      }
      setAsyncStarted(true);
      toast.success(copy.payment.asyncStarted);
      onAsyncStarted?.();
    } catch (err) {
      const message = paymentErrorMessage(err, copy);
      setError(message);
    } finally {
      setPending(false);
    }
  }
  return { pay, pending, error, asyncStarted };
}

/** Panneau "Payer en ligne" pour une inscription existante en attente de paiement. */
export function PaymentPanel({
  enrollmentId,
  methods,
  onAsyncStarted,
}: {
  enrollmentId: string;
  methods: PaymentMethod[];
  onAsyncStarted?: () => void;
}) {
  const copy = useCopy();
  const [choice, setChoice] = useState<PaymentChoiceValue | null>(methods[0] ?? null);
  const { pay, pending, error, asyncStarted } = usePayAction(onAsyncStarted);

  if (methods.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-canvas p-3 text-sm text-subtle">{copy.payment.offlineOnly}</p>
        <OfflineInstructionsBox />
      </div>
    );
  }
  if (asyncStarted) {
    return (
      <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
        {copy.payment.asyncInstructions}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentMethodPicker methods={methods} value={choice} onChange={setChoice} allowOffline={false} disabled={pending} />
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        disabled={pending || !choice || choice === OFFLINE}
        onClick={() => choice && choice !== OFFLINE && void pay(enrollmentId, choice)}
      >
        {pending && <Spinner />}
        {pending ? copy.payment.redirecting : copy.payment.payNow}
      </Button>
    </div>
  );
}
