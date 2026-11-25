"use client";

import Link from "next/link";
import { useState } from "react";

import { useRequestPayout } from "../hooks/useWallet";
import { DEFAULT_MINIMUM_PAYOUT_THRESHOLD } from "../schemas/wallet.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";

interface RequestPayoutDialogProps {
  availableAmount: number;
  currency: string;
}

/**
 * Demande de reversement (ENT-69): porte sur la totalité du solde disponible, au-dessus du seuil (RG-23), vers le
 * compte enregistré dans Paramètres > Reversement ET vérifié par un administrateur (ENT-11).
 */
export function RequestPayoutDialog({ availableAmount, currency }: RequestPayoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; accountIssue: boolean } | null>(null);
  const requestPayout = useRequestPayout();
  const belowThreshold = availableAmount < DEFAULT_MINIMUM_PAYOUT_THRESHOLD;

  async function onConfirm() {
    setSubmitError(null);
    try {
      await requestPayout.mutateAsync();
      setOpen(false);
    } catch (err) {
      setSubmitError({
        message: err instanceof ApiError ? err.message : "Demande impossible.",
        accountIssue: err instanceof ApiError && err.code === "COMPTE_REVERSEMENT_NON_VERIFIE",
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={belowThreshold} title={belowThreshold ? "Solde disponible sous le seuil minimum" : undefined}>
          Demander un reversement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander un reversement</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Montant versé: la totalité du solde disponible, soit <strong>{formatAmount(availableAmount, currency)}</strong>.
            Il est viré sur le compte enregistré dans{" "}
            <Link href="/settings" className="underline">
              Paramètres &gt; Reversement
            </Link>
            , qui doit avoir été vérifié par la plateforme. La demande suit une double validation (opérateur puis
            finance).
          </p>
          {submitError && (
            <p role="alert" className="text-sm text-danger">
              {submitError.message}
              {submitError.accountIssue && " Renseignez ou corrigez vos coordonnées dans les Paramètres, puis attendez leur vérification."}
            </p>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => void onConfirm()} disabled={requestPayout.isPending}>
              {requestPayout.isPending && <Spinner />}
              Confirmer la demande
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
