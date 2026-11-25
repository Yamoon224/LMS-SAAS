"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { RejectOfflinePaymentValues } from "../schemas/enrollment.schema";
import { rejectOfflinePaymentSchema } from "../schemas/enrollment.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";

interface RejectOfflinePaymentDialogProps {
  isPending: boolean;
  onReject: (values: RejectOfflinePaymentValues) => Promise<unknown>;
}

/** Refus d'un paiement hors plateforme (ENT-61) : le motif est obligatoire et communiqué à l'apprenant. */
export function RejectOfflinePaymentDialog({ isPending, onReject }: RejectOfflinePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectOfflinePaymentValues>({ resolver: zodResolver(rejectOfflinePaymentSchema), defaultValues: { reason: "" } });

  async function onSubmit(values: RejectOfflinePaymentValues) {
    setSubmitError(null);
    try {
      await onReject(values);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Refus impossible.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" disabled={isPending}>
          {isPending && <Spinner />}
          Refuser le paiement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser le paiement hors plateforme</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">Motif du refus</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              maxLength={500}
              placeholder="Ex. : virement non reçu après 10 jours."
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            <p className="text-xs text-muted-foreground">Ce motif sera communiqué à l&apos;apprenant. L&apos;inscription passera à « Refusée » (état définitif).</p>
            {errors.reason && <p className="text-xs text-danger">{errors.reason.message}</p>}
          </div>
          {submitError && (
            <p role="alert" className="text-xs text-danger">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Refuser
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
