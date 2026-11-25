"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useSavePayoutAccount } from "../hooks/useSettings";
import { MOBILE_MONEY_OPERATORS, MOBILE_OPERATOR_LABELS, payoutAccountFormSchema } from "../schemas/settings.schema";
import type { PayoutAccountFormValues, TenantSettings } from "../schemas/settings.schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

const EMPTY: PayoutAccountFormValues = { type: "MOBILE_MONEY", operator: undefined, accountNumber: "", accountName: "", currentPassword: "" };

function CurrentAccount({ settings }: { settings: TenantSettings }) {
  const account = settings.payoutAccount;
  if (!account) {
    return <p className="text-sm text-muted-foreground">Aucun compte de reversement enregistré : aucun reversement n’est possible.</p>;
  }
  const operator = account.operator ? (MOBILE_OPERATOR_LABELS[account.operator as keyof typeof MOBILE_OPERATOR_LABELS] ?? account.operator) : null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{account.type === "BANK" ? "Compte bancaire" : `Mobile Money${operator ? ` · ${operator}` : ""}`}</span>
        <Badge variant={settings.payoutAccountVerified ? "success" : "warning"}>
          {settings.payoutAccountVerified ? "Vérifié" : "Non vérifié"}
        </Badge>
      </div>
      <p className="text-muted-foreground">
        {account.accountName} · <span className="font-mono">{account.maskedNumber}</span>
      </p>
      {!settings.payoutAccountVerified && (
        <p className="text-xs text-muted-foreground">
          Un administrateur de la plateforme doit vérifier ce compte avant tout reversement.
        </p>
      )}
    </div>
  );
}

/** ENT-11 : coordonnées de reversement. Le mot de passe actuel est demandé à chaque enregistrement. */
export function PayoutAccountForm({ settings }: { settings: TenantSettings }) {
  const save = useSavePayoutAccount();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PayoutAccountFormValues>({ resolver: zodResolver(payoutAccountFormSchema), defaultValues: EMPTY });

  const type = watch("type");

  async function onSubmit(values: PayoutAccountFormValues) {
    setServerError(null);
    try {
      await save.mutateAsync(values);
      reset(EMPTY);
    } catch (err) {
      // Le mot de passe est toujours effacé après une tentative ; le message serveur est affiché en ligne.
      reset({ ...values, currentPassword: "" });
      setServerError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coordonnées de reversement</CardTitle>
        <CardDescription>
          Compte sur lequel vos ventes en ligne vous sont reversées. Toute modification remet le compte à « non vérifié ».
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CurrentAccount settings={settings} />
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate autoComplete="off">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="payout-type" label="Type de compte" required>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="payout-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                      <SelectItem value="BANK">Compte bancaire (IBAN / RIB)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {type === "MOBILE_MONEY" && (
              <Field id="payout-operator" label="Opérateur" required error={errors.operator?.message}>
                <Controller
                  control={control}
                  name="operator"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="payout-operator" aria-invalid={Boolean(errors.operator)}>
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOBILE_MONEY_OPERATORS.map((operator) => (
                          <SelectItem key={operator} value={operator}>
                            {MOBILE_OPERATOR_LABELS[operator]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
            <Field
              id="payout-number"
              label={type === "BANK" ? "IBAN ou RIB" : "Numéro Mobile Money"}
              required
              error={errors.accountNumber?.message}
            >
              <Input id="payout-number" placeholder={type === "BANK" ? "CI93 CI00 8012 3456 7890 1234 5678" : "+2250700000000"} autoComplete="off" aria-invalid={Boolean(errors.accountNumber)} {...register("accountNumber")} />
            </Field>
            <Field id="payout-name" label="Titulaire du compte" required error={errors.accountName?.message}>
              <Input id="payout-name" placeholder="Awa Koné" autoComplete="off" maxLength={120} aria-invalid={Boolean(errors.accountName)} {...register("accountName")} />
            </Field>
          </div>
          <Field
            id="payout-password"
            label="Mot de passe actuel"
            required
            hint="Demandé pour confirmer qu’il s’agit bien de vous."
            error={errors.currentPassword?.message}
          >
            <PasswordInput id="payout-password" placeholder="••••••••" autoComplete="current-password" aria-invalid={Boolean(errors.currentPassword)} {...register("currentPassword")} />
          </Field>
          {serverError && (
            <p role="alert" className="text-sm text-danger">
              {serverError}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              Enregistrer les coordonnées
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
