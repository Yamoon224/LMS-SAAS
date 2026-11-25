"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useExecutePayout } from "../hooks/usePayoutActions";
import type { ExecutePayoutValues } from "../schemas/wallet.schema";
import { executePayoutSchema } from "../schemas/wallet.schema";

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

interface ExecutePayoutDialogProps {
  /** Reversement ciblé ; `null` = fermé. */
  payoutId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ExecutePayoutDialog({ payoutId, onOpenChange }: ExecutePayoutDialogProps) {
  const executePayout = useExecutePayout();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExecutePayoutValues>({ resolver: zodResolver(executePayoutSchema), defaultValues: { proofUrl: "" } });

  useEffect(() => {
    if (payoutId) reset({ proofUrl: "" });
  }, [payoutId, reset]);

  async function onSubmit(values: ExecutePayoutValues) {
    if (!payoutId) return;
    try {
      await executePayout.mutateAsync({ id: payoutId, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={payoutId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exécuter le reversement</DialogTitle>
          <DialogDescription>
            Virement bancaire ou mobile money, effectué manuellement : joignez l’URL du justificatif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="proofUrl" label="URL du justificatif" required error={errors.proofUrl?.message}>
            <Input id="proofUrl" type="url" placeholder="https://…" aria-invalid={Boolean(errors.proofUrl)} {...register("proofUrl")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={executePayout.isPending}>
              {executePayout.isPending && <Spinner />}
              Confirmer l’exécution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
