"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useFinanceSettings, useUpdateFinanceSettings } from "../hooks/useFinanceSettings";
import {
  buildSettingsPatch,
  FEE_BEARER_LABELS,
  financeSettingsFormSchema,
  PAYOUT_FREQUENCY_LABELS,
  toFormValues,
} from "../schemas/finance-settings.schema";
import type { FinanceSettings, FinanceSettingsFormValues } from "../schemas/finance-settings.schema";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, StickyFormBar } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

function SettingsForm({ settings, defaults }: { settings: FinanceSettings; defaults: FinanceSettings }) {
  const update = useUpdateFinanceSettings();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FinanceSettingsFormValues>({
    resolver: zodResolver(financeSettingsFormSchema),
    defaultValues: toFormValues(settings),
  });

  // Après un enregistrement, le formulaire repart des valeurs en vigueur renvoyées par le serveur.
  useEffect(() => reset(toFormValues(settings)), [settings, reset]);

  async function onSubmit(values: FinanceSettingsFormValues) {
    const patch = buildSettingsPatch(settings, values);
    if (Object.keys(patch).length === 0) return;
    try {
      await update.mutateAsync(patch);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Les modifications ne s’appliquent qu’aux <strong>ventes futures</strong> : une vente déjà comptabilisée garde sa date de
        disponibilité et son net. Chaque changement est inscrit au journal d’audit.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Reversements aux entreprises</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="retentionDays"
            label="Délai de rétention (jours)"
            required
            error={errors.retentionDays?.message}
            hint={`Entre 0 et 90 jours. Par défaut : ${defaults.retentionDays}.`}
          >
            <Input id="retentionDays" placeholder="7" inputMode="numeric" aria-invalid={Boolean(errors.retentionDays)} {...register("retentionDays")} />
          </Field>
          <Field
            id="minimumPayoutThreshold"
            label="Seuil minimal de reversement"
            required
            error={errors.minimumPayoutThreshold?.message}
            hint={`Montant entier, sans décimales. Par défaut : ${defaults.minimumPayoutThreshold}.`}
          >
            <Input
              id="minimumPayoutThreshold"
              placeholder="10000"
              inputMode="numeric"
              aria-invalid={Boolean(errors.minimumPayoutThreshold)}
              {...register("minimumPayoutThreshold")}
            />
          </Field>
          <Field
            id="payoutFrequency"
            label="Fréquence de reversement"
            hint="Automatique : une demande est créée pour chaque entreprise éligible ; la double validation humaine reste obligatoire."
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="payoutFrequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="payoutFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYOUT_FREQUENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frais de transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id="transactionFeeBearer" label="Frais du fournisseur de paiement supportés par">
            <Controller
              control={control}
              name="transactionFeeBearer"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="transactionFeeBearer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FEE_BEARER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <StickyFormBar>
        <Button type="button" variant="outline" disabled={!isDirty || update.isPending} onClick={() => reset(toFormValues(settings))}>
          Annuler les modifications
        </Button>
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          Enregistrer
        </Button>
      </StickyFormBar>
    </form>
  );
}

/** ADM-21 / ADM-23 : paramètres financiers de la plateforme. */
export function FinanceSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useFinanceSettings();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger les paramètres financiers." error={error} onRetry={() => void refetch()} />;
  return <SettingsForm settings={data.settings} defaults={data.defaults} />;
}
