"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useRefundPayment } from "../hooks/useRefundPayment";
import type { RefundPaymentValues } from "../schemas/payment-provider.schema";
import { refundPaymentSchema } from "../schemas/payment-provider.schema";

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
import { Textarea } from "@/components/ui/textarea";

interface RefundPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ADM-26: traitement d'un remboursement. Le backend n'expose aucune liste de transactions : l'identifiant du
 * paiement doit être saisi manuellement (copié depuis le support ou les journaux).
 */
export function RefundPaymentDialog({ open, onOpenChange }: RefundPaymentDialogProps) {
  const [paymentId, setPaymentId] = useState("");
  const refundPayment = useRefundPayment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RefundPaymentValues>({
    resolver: zodResolver(refundPaymentSchema),
    defaultValues: { amount: 0, reason: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ amount: 0, reason: "" });
      setPaymentId("");
    }
  }, [open, reset]);

  async function onSubmit(values: RefundPaymentValues) {
    try {
      await refundPayment.mutateAsync({ paymentId: paymentId.trim(), values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Traiter un remboursement</DialogTitle>
          <DialogDescription>
            Si le fournisseur propose une API de remboursement, elle est utilisée automatiquement ; sinon le
            remboursement doit être exécuté manuellement auprès du fournisseur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="refund-payment-id" label="Identifiant du paiement" required>
            <Input id="refund-payment-id" placeholder="Identifiant du paiement" value={paymentId} onChange={(event) => setPaymentId(event.target.value)} />
          </Field>

          <Field id="refund-amount" label="Montant à rembourser" required error={errors.amount?.message}>
            <Input id="refund-amount" placeholder="10000" type="number" inputMode="numeric" min={1} aria-invalid={Boolean(errors.amount)} {...register("amount")} />
          </Field>

          <Field id="refund-reason" label="Motif" hint="Facultatif.">
            <Textarea id="refund-reason" rows={2} placeholder="Ex. : paiement en double" {...register("reason")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={refundPayment.isPending || !paymentId.trim()}>
              {refundPayment.isPending && <Spinner />}
              Confirmer le remboursement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
