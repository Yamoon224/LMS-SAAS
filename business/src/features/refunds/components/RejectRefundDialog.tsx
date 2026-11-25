"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useRejectRefund } from "../hooks/useRefunds";
import { rejectRefundSchema } from "../schemas/refund.schema";
import type { RejectRefundValues } from "../schemas/refund.schema";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface RejectRefundDialogProps {
  /** Demande ciblée ; `null` = fermé. */
  refundId: string | null;
  onOpenChange: (open: boolean) => void;
}

/** Refus motivé d'une demande de remboursement (ENT-70). */
export function RejectRefundDialog({ refundId, onOpenChange }: RejectRefundDialogProps) {
  const rejectRefund = useRejectRefund();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectRefundValues>({ resolver: zodResolver(rejectRefundSchema), defaultValues: { note: "" } });

  useEffect(() => {
    if (refundId) reset({ note: "" });
  }, [refundId, reset]);

  async function onSubmit(values: RejectRefundValues) {
    if (!refundId) return;
    try {
      await rejectRefund.mutateAsync({ id: refundId, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={refundId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
          <DialogDescription>Le motif est transmis à l’apprenant et conservé dans l’historique.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="refund-note" label="Motif du refus" required error={errors.note?.message}>
            <Textarea id="refund-note" rows={3} placeholder="Ex. : délai de remboursement dépassé." aria-invalid={Boolean(errors.note)} {...register("note")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={rejectRefund.isPending}>
              {rejectRefund.isPending && <Spinner />}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
