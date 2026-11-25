"use client";

import { useEffect, useState } from "react";

import { useSaveIntegration, useSmtpTest } from "../hooks/useIntegrations";
import { buildSaveBody, initialFormState } from "../schemas/integration.schema";
import type { Integration, IntegrationField, IntegrationFormState } from "../schemas/integration.schema";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";

function inputType(field: IntegrationField): "text" | "number" | "email" {
  if (field.kind === "port") return "number";
  if (field.kind === "email") return "email";
  return "text";
}

function FieldInput({
  field,
  state,
  onChange,
  onToggleClear,
}: {
  field: IntegrationField;
  state: IntegrationFormState;
  onChange: (key: string, value: string) => void;
  onToggleClear: (key: string) => void;
}) {
  const value = state.values[field.key] ?? "";
  const clearing = state.clearSecrets.includes(field.key);

  if (field.kind === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={value === "true"}
          onChange={(event) => onChange(field.key, event.target.checked ? "true" : "false")}
        />
        {field.label}
      </label>
    );
  }

  if (field.secret) {
    return (
      <Field
        id={field.key}
        label={field.label}
        required={field.required}
        hint={
          field.configured
            ? "Une valeur est déjà enregistrée : laissez vide pour la conserver, ou saisissez-en une nouvelle."
            : "Aucune valeur enregistrée."
        }
      >
        {field.kind === "pem" ? (
          <textarea
            id={field.key}
            rows={4}
            disabled={clearing}
            spellCheck={false}
            autoComplete="off"
            placeholder="-----BEGIN PRIVATE KEY-----"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs shadow-sm"
            value={value}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        ) : (
          <PasswordInput
            id={field.key}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={clearing}
            value={value}
            onChange={(event) => onChange(field.key, event.target.value)}
            showLabel="Afficher la valeur"
            hideLabel="Masquer la valeur"
          />
        )}
        {field.configured && (
          // eslint-disable-next-line jsx-a11y/label-has-associated-control -- Checkbox rend un <input> natif
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={clearing} onChange={() => onToggleClear(field.key)} />
            Supprimer la valeur enregistrée
          </label>
        )}
      </Field>
    );
  }

  return (
    <Field id={field.key} label={field.label} required={field.required}>
      <Input
        id={field.key}
        type={inputType(field)}
        placeholder={field.label}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </Field>
  );
}

/** Test d'envoi : uniquement pour l'e-mail, avec la configuration DÉJÀ enregistrée. */
function SmtpTestBox() {
  const test = useSmtpTest();
  const [to, setTo] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Tester l&apos;envoi</p>
      <p className="text-xs text-muted-foreground">
        Utilise la configuration enregistrée (enregistrez d&apos;abord vos modifications).
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="adresse@exemple.com"
          aria-label="Adresse de test"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={test.isPending || to.trim() === ""}
          onClick={() => test.mutate(to.trim())}
        >
          {test.isPending && <Spinner />}
          Envoyer
        </Button>
      </div>
    </div>
  );
}

/** Configuration d'une intégration. Les secrets ne sont jamais préremplis ni affichés. */
export function IntegrationDialog({
  integration,
  onOpenChange,
}: {
  integration: Integration | null;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveIntegration();
  const [state, setState] = useState<IntegrationFormState>({ values: {}, clearSecrets: [] });

  useEffect(() => {
    if (integration) setState(initialFormState(integration));
  }, [integration]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!integration) return;
    try {
      await save.mutateAsync({ provider: integration.provider, body: buildSaveBody(integration, state) });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache (liste des problèmes de validation)
    }
  }

  function toggleClear(key: string) {
    setState((current) => ({
      ...current,
      clearSecrets: current.clearSecrets.includes(key)
        ? current.clearSecrets.filter((entry) => entry !== key)
        : [...current.clearSecrets, key],
    }));
  }

  return (
    <Dialog open={integration !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{integration?.label}</DialogTitle>
          <DialogDescription>
            Les secrets sont chiffrés avant d&apos;être enregistrés et ne sont jamais réaffichés. Les adresses doivent
            être publiques et en HTTPS.
          </DialogDescription>
        </DialogHeader>
        <form id="integration-form" onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
          {integration?.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              state={state}
              onChange={(key, value) => setState((current) => ({ ...current, values: { ...current.values, [key]: value } }))}
              onToggleClear={toggleClear}
            />
          ))}
        </form>
        {integration?.provider === "EMAIL_SMTP" && <SmtpTestBox />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="integration-form" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
