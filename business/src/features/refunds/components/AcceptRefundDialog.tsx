"use client";

import { useEffect, useState } from "react";

import { useAcceptRefund } from "../hooks/useRefunds";
import { parseAcceptedAmount } from "../schemas/refund.schema";
import type { RefundRequest } from "../schemas/refund.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatAmount } from "@/lib/format";

/** Acceptation d'une demande : remboursement intégral, ou partiel en saisissant un montant (ENT-70). */
export function AcceptRefundDialog({
  refund,
  onOpenChange,
}: {
  /** Demande ciblée ; `null` = fermé. */
  refund: RefundRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const accept = useAcceptRefund();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (refund) {
      setText("");
      setError(undefined);
    }
  }, [refund]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!refund) return;
    const parsed = parseAcceptedAmount(text, refund.amount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    try {
      await accept.mutateAsync({ id: refund.id, amount: parsed.amount });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={refund !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accepter la demande</DialogTitle>
          <DialogDescription>
            Montant payé par l&apos;apprenant : {refund ? formatAmount(refund.amount, refund.currency) : ""}. Laissez le
            champ vide pour un remboursement intégral, ou saisissez un montant pour un remboursement partiel. Votre part
            sur la vente est reprise au prorata.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
          <Field
            id="refund-amount"
            label={`Montant à rembourser${refund ? ` (${refund.currency})` : ""}`}
            hint="Facultatif. Un seul remboursement est possible par achat : le reste ne pourra plus être remboursé."
            error={error}
          >
            <Input
              id="refund-amount"
              inputMode="numeric"
              aria-invalid={Boolean(error)}
              placeholder={refund ? String(refund.amount) : ""}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={accept.isPending}>
              {accept.isPending && <Spinner />}
              Accepter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
