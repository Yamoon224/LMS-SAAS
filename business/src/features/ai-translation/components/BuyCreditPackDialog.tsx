"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { usePurchaseCreditPack } from "../hooks/useAiTranslation";
import type { CreditPack, PurchaseCreditPackValues, PurchaseResult } from "../schemas/ai-translation.schema";
import { PAYMENT_METHOD_LABELS, purchaseCreditPackSchema } from "../schemas/ai-translation.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";
import { formatAmount } from "@/lib/format";

/** Achat d'un pack de crédits IA (ENT-06): choix du moyen de paiement, puis redirection vers le checkout. */
export function BuyCreditPackDialog({ pack }: { pack: CreditPack }) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const purchase = usePurchaseCreditPack();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseCreditPackValues>({
    resolver: zodResolver(purchaseCreditPackSchema),
    defaultValues: { method: "CARD", customerEmail: "" },
  });

  async function onSubmit(values: PurchaseCreditPackValues) {
    setSubmitError(null);
    try {
      const data = await purchase.mutateAsync({ creditPackId: pack.id, values });
      if (data.checkout.checkoutUrl) {
        window.location.assign(data.checkout.checkoutUrl);
        return;
      }
      setResult(data);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Achat impossible.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSubmitError(null);
          setResult(null);
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          {pack.name} — {pack.creditsAmount.toLocaleString("fr-FR")} crédits ({formatAmount(pack.price, pack.currency)})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acheter le pack « {pack.name} »</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              Paiement initié (référence <span className="font-mono">{result.checkout.providerReference}</span>).
            </p>
            <p className="text-muted-foreground">
              {result.checkout.isAsync
                ? "Validez le paiement sur votre téléphone. Les crédits seront ajoutés dès la confirmation du paiement."
                : "Les crédits seront ajoutés dès la confirmation du paiement."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-muted-foreground">
              {pack.creditsAmount.toLocaleString("fr-FR")} crédits pour {formatAmount(pack.price, pack.currency)}. Le
              solde est crédité uniquement après confirmation du paiement par le serveur.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="method">Moyen de paiement</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerEmail">E-mail du payeur (optionnel)</Label>
              <Input id="customerEmail" type="email" placeholder="exemple@entreprise.com" {...register("customerEmail")} />
              {errors.customerEmail && <p className="text-xs text-danger">{errors.customerEmail.message}</p>}
            </div>

            {submitError && <p className="text-xs text-danger">{submitError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                Payer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
