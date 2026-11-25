"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useSetProviderConfig } from "../hooks/useSetProviderConfig";
import type {
  PaymentProviderCode,
  PaymentProviderConfig,
  SetProviderConfigValues,
} from "../schemas/payment-provider.schema";
import { setProviderConfigSchema } from "../schemas/payment-provider.schema";

import { CREDENTIAL_FIELDS_BY_CODE, ProviderConfigForm } from "./ProviderConfigForm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface ProviderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Présent en mode édition : préremplit tout sauf les identifiants (jamais renvoyés par l'API). */
  existingConfig?: PaymentProviderConfig;
}

const CREATE_DEFAULTS: SetProviderConfigValues = {
  code: "PAYSTACK",
  label: "",
  isActive: false,
  isTestMode: true,
  priority: 0,
  supportedMethods: [],
  credentials: {},
};

/**
 * ADM-20: configuration d'un fournisseur de paiement. Les identifiants sont chiffrés côté serveur et jamais
 * renvoyés : ils doivent être resaisis en entier à chaque enregistrement (l'API les remplace intégralement).
 */
export function ProviderConfigDialog({ open, onOpenChange, existingConfig }: ProviderConfigDialogProps) {
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const setProviderConfig = useSetProviderConfig();
  const isEditMode = Boolean(existingConfig);

  const form = useForm<SetProviderConfigValues>({
    resolver: zodResolver(setProviderConfigSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setCredentialsError(null);
      form.reset(existingConfig ? { ...existingConfig, credentials: {} } : CREATE_DEFAULTS);
    }
  }, [open, existingConfig, form]);

  async function onSubmit(values: SetProviderConfigValues) {
    const nonEmptyCredentials = Object.fromEntries(
      Object.entries(values.credentials).filter(([, value]) => value.trim() !== ""),
    );

    const credentialFields = CREDENTIAL_FIELDS_BY_CODE[values.code as PaymentProviderCode];
    const missingField = credentialFields.find((field) => !nonEmptyCredentials[field.key]);
    if (missingField) {
      setCredentialsError(
        `Tous les identifiants (${credentialFields.map((f) => f.label).join(", ")}) doivent être resaisis pour ${
          isEditMode ? "modifier" : "créer"
        } ce fournisseur — ils ne sont jamais préremplis.`,
      );
      return;
    }
    setCredentialsError(null);

    try {
      await setProviderConfig.mutateAsync({ ...values, credentials: nonEmptyCredentials });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Modifier ${existingConfig?.label}` : "Configurer un fournisseur de paiement"}
          </DialogTitle>
          <DialogDescription>
            Activation, mode test/production, moyens de paiement et priorité de routage. Les identifiants
            sont chiffrés côté serveur et jamais réaffichés : à resaisir en entier à chaque enregistrement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="flex flex-col gap-4" noValidate>
          <ProviderConfigForm form={form} isEditMode={isEditMode} />

          {credentialsError && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {credentialsError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={setProviderConfig.isPending}>
              {setProviderConfig.isPending && <Spinner />}
              {isEditMode ? "Enregistrer" : "Configurer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
