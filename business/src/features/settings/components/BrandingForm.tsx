"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useSaveBranding } from "../hooks/useSettings";
import { brandingFormSchema } from "../schemas/settings.schema";
import type { BrandingFormInput, BrandingFormValues, TenantSettings } from "../schemas/settings.schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function toDefaults(settings: TenantSettings): BrandingFormInput {
  return {
    displayName: settings.displayName,
    logoUrl: settings.branding.logoUrl ?? "",
    primaryColor: settings.branding.primaryColor ?? "",
    secondaryColor: settings.branding.secondaryColor ?? "",
  };
}

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function ColorPreview({ primary, secondary }: { primary: string; secondary: string }) {
  const valid = (value: string) => (COLOR_PATTERN.test(value.trim()) ? value.trim() : undefined);
  return (
    <div className="flex items-center gap-3" aria-label="Aperçu des couleurs">
      <span
        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-white"
        style={{ backgroundColor: valid(primary) ?? "#94a3b8" }}
      >
        Bouton principal
      </span>
      <span
        className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-white"
        style={{ backgroundColor: valid(secondary) ?? "#cbd5e1" }}
      >
        Couleur secondaire
      </span>
    </div>
  );
}

/** ENT-08 : nom d'affichage, logo (URL https saisie), couleurs, avec aperçu. */
export function BrandingForm({ settings }: { settings: TenantSettings }) {
  const save = useSaveBranding();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<BrandingFormInput, unknown, BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: toDefaults(settings),
  });

  useEffect(() => reset(toDefaults(settings)), [settings, reset]);

  const logo = watch("logoUrl") ?? "";
  const primary = watch("primaryColor") ?? "";
  const secondary = watch("secondaryColor") ?? "";
  const logoPreview = /^https:\/\//i.test(logo.trim()) ? logo.trim() : null;

  async function onSubmit(values: BrandingFormValues) {
    try {
      await save.mutateAsync(values);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité visuelle</CardTitle>
        <CardDescription>Nom, logo et couleurs repris dans l’espace apprenant de votre entreprise.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="displayName" label="Nom d’affichage" required error={errors.displayName?.message}>
            <Input id="displayName" placeholder="Académie Horizon" maxLength={120} aria-invalid={Boolean(errors.displayName)} {...register("displayName")} />
          </Field>
          <Field id="logoUrl" label="URL du logo" hint="Adresse https:// d’une image (le téléversement n’est pas encore disponible)." error={errors.logoUrl?.message}>
            <Input id="logoUrl" type="url" inputMode="url" placeholder="https://…" aria-invalid={Boolean(errors.logoUrl)} {...register("logoUrl")} />
          </Field>
          {logoPreview && (
            <img src={logoPreview} alt="Aperçu du logo" className="h-16 w-auto max-w-[200px] rounded-md border border-border object-contain p-1" referrerPolicy="no-referrer" />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="primaryColor" label="Couleur principale" hint="Format #RRGGBB" error={errors.primaryColor?.message}>
              <Input id="primaryColor" placeholder="#1D4ED8" maxLength={7} aria-invalid={Boolean(errors.primaryColor)} {...register("primaryColor")} />
            </Field>
            <Field id="secondaryColor" label="Couleur secondaire" hint="Format #RRGGBB" error={errors.secondaryColor?.message}>
              <Input id="secondaryColor" placeholder="#0F172A" maxLength={7} aria-invalid={Boolean(errors.secondaryColor)} {...register("secondaryColor")} />
            </Field>
          </div>
          <ColorPreview primary={primary} secondary={secondary} />
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !isDirty}>
              {save.isPending && <Spinner />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
