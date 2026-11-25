"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useUpdateTenant } from "../hooks/useUpdateTenant";
import type { TenantOverview } from "../schemas/tenant-overview.schema";
import { updateTenantSchema } from "../schemas/tenant.schema";
import type { UpdateTenantValues } from "../schemas/tenant.schema";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Spinner } from "@/components/ui/spinner";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, LOCALE_OPTIONS, withCurrent } from "@/lib/reference-data";

function defaultsOf(tenant: TenantOverview["tenant"]): UpdateTenantValues {
  return {
    name: tenant.name,
    country: tenant.country,
    currency: tenant.currency,
    defaultLocale: tenant.defaultLocale,
    contactEmail: tenant.contactEmail ?? "",
    contactPhone: tenant.contactPhone ?? "",
  };
}

interface EditTenantDialogProps {
  tenant: TenantOverview["tenant"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** ADM-10 : modification des informations générales et des contacts. Le sous-domaine reste fixe. */
export function EditTenantDialog({ tenant, open, onOpenChange }: EditTenantDialogProps) {
  const updateTenant = useUpdateTenant();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateTenantValues>({ resolver: zodResolver(updateTenantSchema), defaultValues: defaultsOf(tenant) });

  useEffect(() => {
    if (open) reset(defaultsOf(tenant));
  }, [open, tenant, reset]);

  async function onSubmit(values: UpdateTenantValues) {
    try {
      await updateTenant.mutateAsync({ tenantId: tenant.id, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier l’entreprise</DialogTitle>
          <DialogDescription>
            Le sous-domaine <strong>{tenant.slug}</strong> ne peut pas être modifié : il identifie l’entreprise dans toutes ses adresses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="tenant-name" label="Nom" required error={errors.name?.message}>
            <Input id="tenant-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field id="tenant-country" label="Pays" required error={errors.country?.message}>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <OptionSelect id="tenant-country" value={field.value} onValueChange={field.onChange} options={withCurrent(COUNTRY_OPTIONS, field.value)} placeholder="Choisir un pays" invalid={Boolean(errors.country)} />
                )}
              />
            </Field>
            <Field id="tenant-currency" label="Devise" required error={errors.currency?.message}>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <OptionSelect id="tenant-currency" value={field.value} onValueChange={field.onChange} options={withCurrent(CURRENCY_OPTIONS, field.value)} placeholder="Choisir une devise" invalid={Boolean(errors.currency)} />
                )}
              />
            </Field>
            <Field id="tenant-locale" label="Langue par défaut" required error={errors.defaultLocale?.message}>
              <Controller
                control={control}
                name="defaultLocale"
                render={({ field }) => (
                  <OptionSelect id="tenant-locale" value={field.value} onValueChange={field.onChange} options={withCurrent(LOCALE_OPTIONS, field.value)} placeholder="Choisir une langue" invalid={Boolean(errors.defaultLocale)} />
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="tenant-email" label="E-mail de l’entreprise" error={errors.contactEmail?.message}>
              <Input id="tenant-email" type="email" autoComplete="off" aria-invalid={Boolean(errors.contactEmail)} {...register("contactEmail")} />
            </Field>
            <Field id="tenant-phone" label="Téléphone" error={errors.contactPhone?.message}>
              <Input id="tenant-phone" type="tel" autoComplete="off" aria-invalid={Boolean(errors.contactPhone)} {...register("contactPhone")} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateTenant.isPending || !isDirty}>
              {updateTenant.isPending && <Spinner />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
