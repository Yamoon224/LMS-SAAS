"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { disableTwoFactor, enableTwoFactor, fetchTwoFactorStatus, regenerateRecoveryCodes, startTwoFactorSetup } from "../api/two-factor.api";

import { PasswordAndCodeForm } from "./PasswordAndCodeForm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecoveryCodesPanel } from "@/features/auth/components/RecoveryCodesPanel";
import { TotpSetupPanel } from "@/features/auth/components/TotpSetupPanel";
import type { TwoFactorSetup, TwoFactorStatus } from "@/features/auth/schemas/two-factor.schema";

const STATUS_KEY = ["two-factor-status"] as const;

type Mode = "idle" | "setup" | "disable" | "regenerate";

interface IdleActionsProps {
  status: TwoFactorStatus;
  isStarting: boolean;
  onStart: () => void;
  onDisable: () => void;
  onRegenerate: () => void;
}

function IdleActions({ status, isStarting, onStart, onDisable, onRegenerate }: IdleActionsProps) {
  if (!status.enabled) {
    return (
      <>
        <p className="flex items-center gap-2 text-sm">
          <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
          {status.required ? "Obligatoire : activez-la dès maintenant." : "Protégez votre compte en l’activant."}
        </p>
        <Button className="self-start" disabled={isStarting} onClick={onStart}>
          Activer la double authentification
        </Button>
      </>
    );
  }
  return (
    <>
      <p className="flex items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
        Codes de récupération restants : <strong>{status.recoveryCodesRemaining}</strong>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onRegenerate}>
          Régénérer les codes de récupération
        </Button>
        {!status.required && (
          <Button variant="destructive" onClick={onDisable}>
            Désactiver
          </Button>
        )}
      </div>
      {status.required && (
        <p className="text-xs text-muted-foreground">
          La double authentification est obligatoire pour ce compte : elle ne peut pas être désactivée. En cas de
          perte de l’appareil, un autre administrateur peut la réinitialiser.
        </p>
      )}
    </>
  );
}

/** Page « Sécurité du compte » : état de la 2FA, activation volontaire, désactivation, codes de récupération. */
export function TwoFactorSettings() {
  const queryClient = useQueryClient();
  const { data: status, isLoading, isError } = useQuery({ queryKey: STATUS_KEY, queryFn: fetchTwoFactorStatus });
  const [mode, setMode] = useState<Mode>("idle");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [shownCodes, setShownCodes] = useState<string[] | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: STATUS_KEY });

  const start = useMutation({
    mutationFn: startTwoFactorSetup,
    onSuccess: (result) => {
      setSetup(result);
      setMode("setup");
    },
  });
  const disable = useMutation({
    meta: { successMessage: "Double authentification désactivée." },
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      setMode("idle");
      refresh();
    },
  });
  const regenerate = useMutation({
    meta: { successMessage: "Nouveaux codes de récupération générés." },
    mutationFn: regenerateRecoveryCodes,
    onSuccess: (codes) => {
      setShownCodes(codes);
      setMode("idle");
      refresh();
    },
  });

  async function confirmSetup(code: string) {
    setShownCodes(await enableTwoFactor(code));
    setSetup(null);
    setMode("idle");
    refresh();
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !status) {
    return <p role="alert" className="text-sm text-danger">Impossible de charger l’état de la double authentification.</p>;
  }

  if (shownCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Codes de récupération</CardTitle>
        </CardHeader>
        <CardContent>
          <RecoveryCodesPanel codes={shownCodes} onDone={() => setShownCodes(null)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Double authentification (TOTP)</CardTitle>
          {status.enabled ? <Badge variant="success">Activée</Badge> : <Badge variant="warning">Désactivée</Badge>}
          {status.required && <Badge variant="outline">Obligatoire</Badge>}
        </div>
        <CardDescription>
          Un code à usage court, généré par une application d’authentification, est demandé en plus du mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mode === "idle" && (
          <IdleActions
            status={status}
            isStarting={start.isPending}
            onStart={() => start.mutate()}
            onDisable={() => setMode("disable")}
            onRegenerate={() => setMode("regenerate")}
          />
        )}
        {mode === "setup" && setup && (
          <TotpSetupPanel setup={setup} onConfirm={confirmSetup} onCancel={() => setMode("idle")} />
        )}
        {mode === "disable" && (
          <PasswordAndCodeForm
            submitLabel="Désactiver la double authentification"
            destructive
            isPending={disable.isPending}
            onSubmit={(values) => disable.mutate(values)}
            onCancel={() => setMode("idle")}
          />
        )}
        {mode === "regenerate" && (
          <PasswordAndCodeForm
            submitLabel="Générer de nouveaux codes"
            isPending={regenerate.isPending}
            onSubmit={(values) => regenerate.mutate(values)}
            onCancel={() => setMode("idle")}
          />
        )}
      </CardContent>
    </Card>
  );
}
