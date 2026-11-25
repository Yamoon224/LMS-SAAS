"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";

import { useTenantBranding, useUpdateTenantBranding } from "../hooks/useTenantBranding";
import { brandingFormSchema } from "../schemas/tenant.schema";
import type { BrandingFormValues } from "../schemas/tenant.schema";

import { LogoField } from "./LogoField";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_COLOR = "#6D28D9";

/** Champ couleur : sélecteur natif + saisie #RRGGBB, tous deux liés à la même valeur. */
function ColorField({
  id,
  label,
  value,
  error,
  register,
  onPick,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  register: UseFormRegisterReturn;
  onPick: (color: string) => void;
}) {
  return (
    <Field id={id} label={label} hint="Format #RRGGBB ; vide pour effacer." error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} : sélecteur de couleur`}
          value={HEX.test(value) ? value : FALLBACK_COLOR}
          onChange={(event) => onPick(event.target.value.toUpperCase())}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-surface p-1"
        />
        <Input id={id} placeholder="#1D4ED8" maxLength={7} aria-invalid={Boolean(error)} className="font-mono" {...register} />
      </div>
    </Field>
  );
}

function BrandingForm({ tenantId, name, defaults, onDone }: { tenantId: string; name: string; defaults: BrandingFormValues; onDone: () => void }) {
  const update = useUpdateTenantBranding();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<BrandingFormValues>({ resolver: zodResolver(brandingFormSchema), defaultValues: defaults });

  const logo = watch("logoUrl");
  const primary = watch("primaryColor");
  const secondary = watch("secondaryColor");
  const color = (value: string, fallback: string) => (HEX.test(value.trim()) ? value.trim() : fallback);

  async function onSubmit(values: BrandingFormValues) {
    try {
      await update.mutateAsync({ tenantId, values });
      onDone();
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <LogoField
        value={logo}
        onChange={(url) => setValue("logoUrl", url, { shouldDirty: true, shouldValidate: true })}
        name={name}
        error={errors.logoUrl?.message}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField
          id="branding-primary"
          label="Couleur principale"
          value={primary}
          error={errors.primaryColor?.message}
          register={register("primaryColor")}
          onPick={(picked) => setValue("primaryColor", picked, { shouldDirty: true, shouldValidate: true })}
        />
        <ColorField
          id="branding-secondary"
          label="Couleur secondaire"
          value={secondary}
          error={errors.secondaryColor?.message}
          register={register("secondaryColor")}
          onPick={(picked) => setValue("secondaryColor", picked, { shouldDirty: true, shouldValidate: true })}
        />
      </div>

      <div aria-label="Aperçu" className="flex flex-wrap items-center gap-3 rounded-md bg-surface-muted p-3">
        <span className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white" style={{ backgroundColor: color(primary, "#94A3B8") }}>
          Bouton principal
        </span>
        <span className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white" style={{ backgroundColor: color(secondary, "#CBD5E1") }}>
          Couleur secondaire
        </span>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={update.isPending || !isDirty}>
          {update.isPending && <Spinner />}
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}

/** ADM-10 : modification de l'identité visuelle (logo https, couleurs principale et secondaire) avec aperçu. */
export function EditBrandingDialog({ tenantId, name, open, onOpenChange }: { tenantId: string; name: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const branding = useTenantBranding(tenantId, open);
  // Le formulaire est remonté à chaque ouverture : il repart toujours des valeurs enregistrées.
  useEffect(() => {
    if (open) void branding.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Modifier l’identité visuelle</DialogTitle>
          <DialogDescription>Logo et couleurs de {name}, appliqués à ses espaces entreprise et apprenant.</DialogDescription>
        </DialogHeader>
        {branding.isLoading || !branding.data ? (
          <div className="space-y-3" role="status" aria-label="Chargement">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <BrandingForm
            key={`${branding.dataUpdatedAt}`}
            tenantId={tenantId}
            name={name}
            defaults={{
              logoUrl: branding.data.logoUrl ?? "",
              primaryColor: branding.data.primaryColor ?? "",
              secondaryColor: branding.data.secondaryColor ?? "",
            }}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
