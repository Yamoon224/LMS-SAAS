"use client";

import { Wand2 } from "lucide-react";
import { Controller } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

import type { WizardValues } from "../schemas/wizard.schema";

import { LogoField } from "./LogoField";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import type { SelectOption } from "@/components/ui/option-select";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { APP_BASE_DOMAIN } from "@/lib/domain";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, LOCALE_OPTIONS } from "@/lib/reference-data";

export interface StepProps {
  register: UseFormRegister<WizardValues>;
  control: Control<WizardValues>;
  errors: FieldErrors<WizardValues>;
  watch: UseFormWatch<WizardValues>;
  setValue: UseFormSetValue<WizardValues>;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function CompanyStep({ register, control, errors }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id="name" label="Nom de l’entreprise" required error={errors.name?.message} className="sm:col-span-2">
        <Input id="name" placeholder="Acme Formation" aria-invalid={Boolean(errors.name)} {...register("name")} />
      </Field>
      <Field id="slug" label="Sous-domaine (slug)" required error={errors.slug?.message} hint={`Accessible ensuite via {slug}.${APP_BASE_DOMAIN}`} className="sm:col-span-2">
        <Input id="slug" placeholder="acme" autoCapitalize="none" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
      </Field>
      <Field id="country" label="Pays" required error={errors.country?.message}>
        <Controller
          control={control}
          name="country"
          render={({ field }) => <OptionSelect id="country" value={field.value} onValueChange={field.onChange} options={COUNTRY_OPTIONS} placeholder="Choisir un pays" invalid={Boolean(errors.country)} />}
        />
      </Field>
      <Field id="currency" label="Devise" required error={errors.currency?.message}>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => <OptionSelect id="currency" value={field.value} onValueChange={field.onChange} options={CURRENCY_OPTIONS} placeholder="Choisir une devise" invalid={Boolean(errors.currency)} />}
        />
      </Field>
      <Field id="defaultLocale" label="Langue par défaut" required error={errors.defaultLocale?.message}>
        <Controller
          control={control}
          name="defaultLocale"
          render={({ field }) => <OptionSelect id="defaultLocale" value={field.value} onValueChange={field.onChange} options={LOCALE_OPTIONS} placeholder="Choisir une langue" invalid={Boolean(errors.defaultLocale)} />}
        />
      </Field>
    </div>
  );
}

function ColorInput({ id, label, error, value, onPick, inputProps }: { id: string; label: string; error?: string; value: string; onPick: (color: string) => void; inputProps: React.InputHTMLAttributes<HTMLInputElement> }) {
  return (
    <Field id={id} label={label} error={error} hint="Format #RRGGBB, facultatif.">
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} : sélecteur de couleur`}
          value={HEX.test(value) ? value : "#6D28D9"}
          onChange={(event) => onPick(event.target.value.toUpperCase())}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-surface p-1"
        />
        <Input id={id} placeholder="#1D4ED8" maxLength={7} className="font-mono" aria-invalid={Boolean(error)} {...inputProps} />
      </div>
    </Field>
  );
}

export function IdentityStep({ register, errors, watch, setValue }: StepProps) {
  const logo = watch("logoUrl");
  const primary = watch("primaryColor");
  const secondary = watch("secondaryColor");
  const color = (value: string, fallback: string) => (HEX.test(value.trim()) ? value.trim() : fallback);
  const pick = (name: "primaryColor" | "secondaryColor") => (picked: string) => setValue(name, picked, { shouldDirty: true, shouldValidate: true });

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="contacts-title" className="flex flex-col gap-4">
        <h3 id="contacts-title" className="text-sm font-semibold">
          Contacts de l’entreprise
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="contactEmail" label="E-mail de l’entreprise" error={errors.contactEmail?.message}>
            <Input id="contactEmail" type="email" placeholder="contact@acme.com" autoComplete="off" aria-invalid={Boolean(errors.contactEmail)} {...register("contactEmail")} />
          </Field>
          <Field id="contactPhone" label="Téléphone" error={errors.contactPhone?.message}>
            <Input id="contactPhone" type="tel" placeholder="+225 07 00 00 00 00" autoComplete="off" aria-invalid={Boolean(errors.contactPhone)} {...register("contactPhone")} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="branding-title" className="flex flex-col gap-4">
        <h3 id="branding-title" className="text-sm font-semibold">
          Identité visuelle
        </h3>
        <LogoField
          value={logo}
          onChange={(url) => setValue("logoUrl", url, { shouldDirty: true, shouldValidate: true })}
          name={watch("name")}
          error={errors.logoUrl?.message}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorInput id="primaryColor" label="Couleur principale" error={errors.primaryColor?.message} value={primary} onPick={pick("primaryColor")} inputProps={register("primaryColor")} />
          <ColorInput id="secondaryColor" label="Couleur secondaire" error={errors.secondaryColor?.message} value={secondary} onPick={pick("secondaryColor")} inputProps={register("secondaryColor")} />
        </div>
        <div aria-label="Aperçu" className="flex flex-wrap items-center gap-3 rounded-md bg-surface-muted p-3">
          <span className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white" style={{ backgroundColor: color(primary, "#94A3B8") }}>
            Bouton principal
          </span>
          <span className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white" style={{ backgroundColor: color(secondary, "#CBD5E1") }}>
            Couleur secondaire
          </span>
        </div>
      </section>
    </div>
  );
}

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

export function OwnerStep({ register, errors, setValue }: StepProps) {
  function fillPassword() {
    const generated = generatePassword();
    setValue("owner.password", generated, { shouldValidate: true });
    setValue("owner.confirmPassword", generated, { shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Premier utilisateur de l’entreprise. Sans mot de passe, il reçoit un lien d’activation par e-mail ; avec un mot de passe, son compte est actif immédiatement.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="owner.email" label="E-mail du propriétaire" required error={errors.owner?.email?.message} className="sm:col-span-2">
          <Input id="owner.email" type="email" placeholder="owner@acme.com" aria-invalid={Boolean(errors.owner?.email)} {...register("owner.email")} />
        </Field>
        <Field id="owner.firstName" label="Prénom" required error={errors.owner?.firstName?.message}>
          <Input id="owner.firstName" placeholder="Aya" {...register("owner.firstName")} />
        </Field>
        <Field id="owner.lastName" label="Nom" required error={errors.owner?.lastName?.message}>
          <Input id="owner.lastName" placeholder="Koné" {...register("owner.lastName")} />
        </Field>
        <Field id="owner.password" label="Mot de passe (optionnel)" error={errors.owner?.password?.message} hint="8 caractères minimum. Laissez vide pour envoyer un lien d’activation.">
          <PasswordInput id="owner.password" autoComplete="new-password" aria-invalid={Boolean(errors.owner?.password)} {...register("owner.password")} />
        </Field>
        <Field id="owner.confirmPassword" label="Confirmer le mot de passe" error={errors.owner?.confirmPassword?.message}>
          <PasswordInput id="owner.confirmPassword" autoComplete="new-password" aria-invalid={Boolean(errors.owner?.confirmPassword)} {...register("owner.confirmPassword")} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="button" variant="outline" size="sm" onClick={fillPassword}>
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Générer un mot de passe
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface BillingStepProps extends StepProps {
  planOptions: SelectOption[];
  plansState: "loading" | "error" | "ready";
  canAssignPlan: boolean;
  canSetCommission: boolean;
}

export function BillingStep({ register, control, errors, watch, planOptions, plansState, canAssignPlan, canSetCommission }: BillingStepProps) {
  const planPriceId = watch("planPriceId");

  return (
    <div className="flex flex-col gap-6">
      {canAssignPlan && (
        <section aria-labelledby="plan-title" className="flex flex-col gap-4">
          <h3 id="plan-title" className="text-sm font-semibold">
            Abonnement
          </h3>
          <Field id="planPriceId" label="Plan et prix" error={errors.planPriceId?.message} hint="Facultatif : vous pourrez attribuer un plan plus tard depuis la fiche de l’entreprise.">
            {plansState === "error" ? (
              <p className="text-sm text-danger">Impossible de charger les plans.</p>
            ) : (
              <Controller
                control={control}
                name="planPriceId"
                render={({ field }) => (
                  <OptionSelect
                    id="planPriceId"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[{ value: "", label: "Aucun plan pour l’instant" }, ...planOptions]}
                    placeholder={plansState === "loading" ? "Chargement des plans…" : "Aucun plan pour l’instant"}
                    disabled={plansState === "loading"}
                  />
                )}
              />
            )}
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div>
              <Label htmlFor="startWithTrial">Démarrer en période d’essai (sans paiement)</Label>
              {!planPriceId && <p className="mt-0.5 text-xs text-muted-foreground">Choisissez d’abord un plan.</p>}
            </div>
            <Controller control={control} name="startWithTrial" render={({ field }) => <Switch id="startWithTrial" checked={field.value && Boolean(planPriceId)} disabled={!planPriceId} onCheckedChange={field.onChange} />} />
          </div>
        </section>
      )}

      {canSetCommission && (
        <section aria-labelledby="commission-title" className="flex flex-col gap-4">
          <div>
            <h3 id="commission-title" className="text-sm font-semibold">
              Commissions de la plateforme
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">Taux propres à cette entreprise. Laissez vide pour appliquer la règle globale de la plateforme.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="onlineCommission" label="Ventes en ligne (%)" error={errors.onlineCommission?.message}>
              <Input id="onlineCommission" inputMode="decimal" placeholder="Ex. 10" aria-invalid={Boolean(errors.onlineCommission)} {...register("onlineCommission")} />
            </Field>
            <Field id="offlineCommission" label="Ventes hors plateforme (%)" error={errors.offlineCommission?.message}>
              <Input id="offlineCommission" inputMode="decimal" placeholder="Ex. 5" aria-invalid={Boolean(errors.offlineCommission)} {...register("offlineCommission")} />
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}

export interface ReviewStepProps {
  values: WizardValues;
  planLabel: string | null;
  canActivate: boolean;
  canEditTenant: boolean;
  canAssignPlan: boolean;
  canSetCommission: boolean;
  control: Control<WizardValues>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm text-muted-foreground sm:w-48">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ReviewStep({ values, planLabel, canActivate, canEditTenant, canAssignPlan, canSetCommission, control }: ReviewStepProps) {
  const countryLabel = COUNTRY_OPTIONS.find((option) => option.value === values.country)?.label ?? values.country;
  const currencyLabel = CURRENCY_OPTIONS.find((option) => option.value === values.currency)?.label ?? values.currency;
  const localeLabel = LOCALE_OPTIONS.find((option) => option.value === values.defaultLocale)?.label ?? values.defaultLocale;
  const dash = "—";

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Entreprise" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Entreprise</h3>
        <dl className="flex flex-col gap-1.5">
          <Row label="Nom">{values.name}</Row>
          <Row label="Adresse">{`${values.slug}.${APP_BASE_DOMAIN}`}</Row>
          <Row label="Pays">{countryLabel}</Row>
          <Row label="Devise">{currencyLabel}</Row>
          <Row label="Langue par défaut">{localeLabel}</Row>
        </dl>
      </section>

      {canEditTenant && (
        <section aria-label="Contacts et identité visuelle" className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Contacts et identité visuelle</h3>
          <dl className="flex flex-col gap-1.5">
            <Row label="E-mail">{values.contactEmail || dash}</Row>
            <Row label="Téléphone">{values.contactPhone || dash}</Row>
            <Row label="Logo">{values.logoUrl || dash}</Row>
            <Row label="Couleurs">{values.primaryColor || values.secondaryColor ? [values.primaryColor, values.secondaryColor].filter(Boolean).join(" · ") : dash}</Row>
          </dl>
        </section>
      )}

      <section aria-label="Propriétaire" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Propriétaire</h3>
        <dl className="flex flex-col gap-1.5">
          <Row label="Nom">{`${values.owner.firstName} ${values.owner.lastName}`}</Row>
          <Row label="E-mail">{values.owner.email}</Row>
          <Row label="Accès">{values.owner.password ? "Compte actif avec le mot de passe défini" : "Lien d’activation envoyé par e-mail"}</Row>
        </dl>
      </section>

      {(canAssignPlan || canSetCommission) && (
        <section aria-label="Facturation" className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Facturation</h3>
          <dl className="flex flex-col gap-1.5">
            {canAssignPlan && <Row label="Plan">{planLabel ? `${planLabel}${values.startWithTrial ? " — période d’essai" : ""}` : "Aucun pour l’instant"}</Row>}
            {canSetCommission && (
              <>
                <Row label="Commission en ligne">{values.onlineCommission ? `${values.onlineCommission} %` : "Règle globale"}</Row>
                <Row label="Commission hors plateforme">{values.offlineCommission ? `${values.offlineCommission} %` : "Règle globale"}</Row>
              </>
            )}
          </dl>
        </section>
      )}

      {canActivate && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div>
            <Label htmlFor="activateNow">Activer l’entreprise immédiatement</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Sinon elle reste en brouillon et ses accès restent fermés jusqu’à son activation.</p>
          </div>
          <Controller control={control} name="activateNow" render={({ field }) => <Switch id="activateNow" checked={field.value} onCheckedChange={field.onChange} />} />
        </div>
      )}
    </div>
  );
}
