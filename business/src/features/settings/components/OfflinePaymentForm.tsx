"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useSaveOfflinePayment } from "../hooks/useSettings";
import { OFFLINE_INSTRUCTIONS_MAX_LENGTH, offlinePaymentFormSchema } from "../schemas/settings.schema";
import type { OfflinePaymentFormValues, TenantSettings } from "../schemas/settings.schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function toDefaults(settings: TenantSettings): OfflinePaymentFormValues {
  return { enabled: settings.offlinePayment.enabled, instructions: settings.offlinePayment.instructions ?? "" };
}

/** ENT-12 : accepter les paiements hors plateforme (virement, espèces…) et dire à l'apprenant comment payer. */
export function OfflinePaymentForm({ settings }: { settings: TenantSettings }) {
  const save = useSaveOfflinePayment();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<OfflinePaymentFormValues>({
    resolver: zodResolver(offlinePaymentFormSchema),
    defaultValues: toDefaults(settings),
  });

  useEffect(() => reset(toDefaults(settings)), [settings, reset]);

  const length = (watch("instructions") ?? "").length;

  async function onSubmit(values: OfflinePaymentFormValues) {
    try {
      await save.mutateAsync(values);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiement hors plateforme</CardTitle>
        <CardDescription>
          Les apprenants qui choisissent ce mode voient vos instructions ; vous validez ensuite chaque paiement reçu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Switch id="offline-enabled" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="offline-enabled">Accepter les paiements hors plateforme</Label>
          </div>
          <Field
            id="offline-instructions"
            label="Instructions de paiement"
            hint={`Texte brut, ${length}/${OFFLINE_INSTRUCTIONS_MAX_LENGTH} caractères. Le HTML est refusé.`}
            error={errors.instructions?.message}
          >
            <Textarea
              id="offline-instructions"
              rows={6}
              maxLength={OFFLINE_INSTRUCTIONS_MAX_LENGTH}
              aria-invalid={Boolean(errors.instructions)}
              placeholder="Ex. : virement sur le compte … avec la référence de votre inscription, ou paiement en agence."
              {...register("instructions")}
            />
          </Field>
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
