import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { PaymentMethodCheckboxList } from "./PaymentMethodCheckboxList";

import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PaymentProviderCode, SetProviderConfigValues } from "@/features/payments/schemas/payment-provider.schema";
import { PAYMENT_PROVIDER_CODE_LABELS } from "@/features/payments/schemas/payment-provider.schema";

/** Champs d'identifiants attendus par fournisseur (voir PaymentGatewayRegistry.buildGateway). */
export const CREDENTIAL_FIELDS_BY_CODE: Record<PaymentProviderCode, { key: string; label: string }[]> = {
  PAYSTACK: [{ key: "secretKey", label: "Clé secrète" }],
  PIXEL_INNOV: [
    { key: "apiKey", label: "Clé API" },
    { key: "apiSecret", label: "Secret API" },
  ],
  OTHER: [{ key: "secretKey", label: "Clé secrète" }],
};

interface ProviderConfigFormProps {
  form: UseFormReturn<SetProviderConfigValues>;
  isEditMode: boolean;
}

/** Champs du formulaire de configuration d'un fournisseur de paiement (ADM-20). */
export function ProviderConfigForm({ form, isEditMode }: ProviderConfigFormProps) {
  const { register, watch, control, formState } = form;
  const errors = formState.errors;
  const code = watch("code");
  const credentialFields = CREDENTIAL_FIELDS_BY_CODE[code];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="provider-code" label="Fournisseur" required>
          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isEditMode}>
                <SelectTrigger id="provider-code">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_PROVIDER_CODE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field id="provider-label" label="Libellé affiché" required error={errors.label?.message}>
          <Input id="provider-label" placeholder="Orange Money" aria-invalid={Boolean(errors.label)} {...register("label")} />
        </Field>
      </div>

      <Field id="provider-priority" label="Priorité" hint="0 = prioritaire." error={errors.priority?.message}>
        <Input id="provider-priority" placeholder="0" type="number" inputMode="numeric" min={0} {...register("priority")} />
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <Label htmlFor="provider-active">Fournisseur actif</Label>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => <Switch id="provider-active" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <Label htmlFor="provider-test">Mode test (clés de test, pas de production)</Label>
        <Controller
          control={control}
          name="isTestMode"
          render={({ field }) => <Switch id="provider-test" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <Field id="provider-methods" label="Moyens de paiement pris en charge" required error={errors.supportedMethods?.message}>
        <Controller
          control={control}
          name="supportedMethods"
          render={({ field }) => <PaymentMethodCheckboxList selectedMethods={field.value} onChange={field.onChange} />}
        />
      </Field>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Identifiants (chiffrés, jamais réaffichés)</legend>
        {credentialFields.map((field) => (
          <Field key={field.key} id={`credentials.${field.key}`} label={field.label} required>
            <PasswordInput id={`credentials.${field.key}`} autoComplete="off" placeholder="••••••••" {...register(`credentials.${field.key}`)} />
          </Field>
        ))}
        {isEditMode && (
          <p className="text-xs text-muted-foreground">
            Obligatoire même en modification : l’API ne renvoie jamais les identifiants enregistrés, ils doivent être
            resaisis en entier.
          </p>
        )}
      </fieldset>
    </>
  );
}
