"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { ValidateOfflinePaymentValues } from "../schemas/enrollment.schema";
import { validateOfflinePaymentSchema } from "../schemas/enrollment.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

interface ValidateOfflinePaymentDialogProps {
  isPending: boolean;
  onValidate: (values: ValidateOfflinePaymentValues) => Promise<unknown>;
}

/** Validation d'un paiement hors plateforme (ENT-61/RG-07) : référence + montant déclaré requis. */
export function ValidateOfflinePaymentDialog({
  isPending,
  onValidate,
}: ValidateOfflinePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValidateOfflinePaymentValues>({
    resolver: zodResolver(validateOfflinePaymentSchema),
    defaultValues: { reference: "", declaredAmount: 0 },
  });

  async function onSubmit(values: ValidateOfflinePaymentValues) {
    setSubmitError(null);
    try {
      await onValidate(values);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Validation impossible.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={isPending}>
          {isPending && <Spinner />}
          Valider le paiement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider un paiement hors plateforme</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Référence du paiement</Label>
            <Input id="reference" placeholder="VIR-2026-00123" {...register("reference")} />
            {errors.reference && <p className="text-xs text-danger">{errors.reference.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="declaredAmount">Montant reçu (déclaré)</Label>
            <Input
              id="declaredAmount"
              placeholder="Ex. : 25000"
              type="number"
              min={1}
              {...register("declaredAmount")}
            />
            {errors.declaredAmount && (
              <p className="text-xs text-danger">{errors.declaredAmount.message}</p>
            )}
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
