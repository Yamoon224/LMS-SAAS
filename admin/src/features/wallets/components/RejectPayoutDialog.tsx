"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useRejectPayout } from "../hooks/usePayoutActions";
import type { RejectPayoutValues } from "../schemas/wallet.schema";
import { rejectPayoutSchema } from "../schemas/wallet.schema";

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

interface RejectPayoutDialogProps {
  /** Reversement ciblé ; `null` = fermé. */
  payoutId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RejectPayoutDialog({ payoutId, onOpenChange }: RejectPayoutDialogProps) {
  const rejectPayout = useRejectPayout();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectPayoutValues>({ resolver: zodResolver(rejectPayoutSchema), defaultValues: { reason: "" } });

  useEffect(() => {
    if (payoutId) reset({ reason: "" });
  }, [payoutId, reset]);

  async function onSubmit(values: RejectPayoutValues) {
    if (!payoutId) return;
    try {
      await rejectPayout.mutateAsync({ id: payoutId, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={payoutId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter le reversement</DialogTitle>
          <DialogDescription>Le motif est obligatoire et conservé dans le journal d’audit.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="reject-reason" label="Motif" required error={errors.reason?.message}>
            <Textarea id="reject-reason" rows={3} placeholder="Ex. : coordonnées de paiement invalides" aria-invalid={Boolean(errors.reason)} {...register("reason")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={rejectPayout.isPending}>
              {rejectPayout.isPending && <Spinner />}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
