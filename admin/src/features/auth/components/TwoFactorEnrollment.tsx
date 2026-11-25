"use client";

import { useEffect, useState } from "react";

import { AuthApiError, confirmEnrollment, fetchEnrollmentSetup } from "../api/auth.api";
import type { TwoFactorSetup } from "../schemas/two-factor.schema";

import { RecoveryCodesPanel } from "./RecoveryCodesPanel";
import { TotpSetupPanel } from "./TotpSetupPanel";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface TwoFactorEnrollmentProps {
  /** La session est déjà ouverte (cookies posés par le serveur) : on peut entrer dans l'application. */
  onComplete: () => void;
  /** Défi expiré ou perdu : retour à la saisie du mot de passe. */
  onRestart: () => void;
}

/** Enrôlement OBLIGATOIRE après le mot de passe : QR + secret + confirmation, puis affichage unique des codes. */
export function TwoFactorEnrollment({ onComplete, onRestart }: TwoFactorEnrollmentProps) {
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEnrollmentSetup()
      .then((result) => !cancelled && setSetup(result))
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.code === "DEFI_2FA_INVALIDE") onRestart();
        else setLoadError(error instanceof Error ? error.message : "Configuration impossible.");
      });
    return () => {
      cancelled = true;
    };
  }, [onRestart]);

  async function confirm(code: string) {
    try {
      setRecoveryCodes(await confirmEnrollment(code));
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "DEFI_2FA_INVALIDE") onRestart();
      throw error;
    }
  }

  if (recoveryCodes) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Double authentification activée</h2>
        <RecoveryCodesPanel codes={recoveryCodes} onDone={onComplete} doneLabel="Continuer vers l’application" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">Activez la double authentification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elle est obligatoire pour ce compte. Vous ne pourrez pas accéder à l’application sans cette étape.
        </p>
      </div>
      {loadError && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
          {loadError}
        </p>
      )}
      {!setup && !loadError && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
      {setup && <TotpSetupPanel setup={setup} onConfirm={confirm} />}
      <Button type="button" variant="link" className="self-center" onClick={onRestart}>
        Retour à la connexion
      </Button>
    </div>
  );
}
