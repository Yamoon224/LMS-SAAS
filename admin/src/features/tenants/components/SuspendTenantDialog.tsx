"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useSuspendTenant } from "../hooks/useSuspendTenant";
import type { SuspendTenantValues, Tenant } from "../schemas/tenant.schema";
import { suspendTenantSchema } from "../schemas/tenant.schema";

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

interface SuspendTenantDialogProps {
  /** Entreprise ciblée ; `null` = fermé. */
  tenant: Tenant | null;
  onOpenChange: (open: boolean) => void;
}

/** ADM-08: suspension d'une entreprise, motif obligatoire. */
export function SuspendTenantDialog({ tenant, onOpenChange }: SuspendTenantDialogProps) {
  const suspendTenant = useSuspendTenant();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SuspendTenantValues>({ resolver: zodResolver(suspendTenantSchema), defaultValues: { reason: "" } });

  useEffect(() => {
    if (tenant) reset({ reason: "" });
  }, [tenant, reset]);

  async function onSubmit(values: SuspendTenantValues) {
    if (!tenant) return;
    try {
      await suspendTenant.mutateAsync({ tenantId: tenant.id, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={tenant !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspendre {tenant?.name} ?</DialogTitle>
          <DialogDescription>
            L’entreprise et ses utilisateurs perdront l’accès à la plateforme jusqu’à réactivation. Le motif est
            obligatoire et reste visible sur la fiche.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="suspend-reason" label="Motif de la suspension" required error={errors.reason?.message}>
            <Textarea
              id="suspend-reason"
              rows={3}
              placeholder="Ex. Non-respect des CGU"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={suspendTenant.isPending}>
              {suspendTenant.isPending && <Spinner />}
              Confirmer la suspension
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
