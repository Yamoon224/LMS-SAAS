"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useReviseCommissionRule } from "../hooks/useReviseCommissionRule";
import { COMMISSION_SCOPE_LABELS, COMMISSION_TYPE_LABELS, reviseCommissionRuleSchema } from "../schemas/commission-rule.schema";
import type { CommissionRule, ReviseCommissionRuleValues } from "../schemas/commission-rule.schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { optionalNumber } from "@/lib/forms";

function defaultsOf(rule: CommissionRule): ReviseCommissionRuleValues {
  return { percentRate: rule.percentRate ?? undefined, fixedAmount: rule.fixedAmount ?? undefined };
}

interface EditCommissionRuleDialogProps {
  /** Règle à modifier ; `null` = fermé. */
  rule: CommissionRule | null;
  /** Libellé de la cible (entreprise, plan…), déjà résolu. */
  target: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * ADM-15/ADM-16 : modification des taux d'une règle. La portée, le type de vente et la cible sont figés ; l'enregistrement crée
 * une nouvelle version datée de maintenant, l'ancienne est conservée dans l'historique (RG-27).
 */
export function EditCommissionRuleDialog({ rule, target, onOpenChange }: EditCommissionRuleDialogProps) {
  const revise = useReviseCommissionRule();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ReviseCommissionRuleValues>({ resolver: zodResolver(reviseCommissionRuleSchema), defaultValues: rule ? defaultsOf(rule) : {} });

  useEffect(() => {
    if (rule) reset(defaultsOf(rule));
  }, [rule, reset]);

  async function onSubmit(values: ReviseCommissionRuleValues) {
    if (!rule) return;
    try {
      await revise.mutateAsync({ id: rule.id, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={rule !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la règle de commission</DialogTitle>
          <DialogDescription>
            Les nouveaux taux s’appliquent aux ventes à venir. Les ventes déjà conclues gardent le taux appliqué à l’époque, et l’ancienne version
            reste consultable dans l’historique.
          </DialogDescription>
        </DialogHeader>

        {rule && (
          <dl className="grid grid-cols-1 gap-3 rounded-md bg-surface-muted p-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Portée</dt>
              <dd className="mt-0.5">
                <Badge variant="outline">{COMMISSION_SCOPE_LABELS[rule.scope]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Cible</dt>
              <dd className="mt-0.5 break-words font-medium">{target}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Type de vente</dt>
              <dd className="mt-0.5 font-medium">{COMMISSION_TYPE_LABELS[rule.type]}</dd>
            </div>
          </dl>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="edit-rule-percent" label="Taux (%)" error={errors.percentRate?.message}>
              <Input
                id="edit-rule-percent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                aria-invalid={Boolean(errors.percentRate)}
                {...register("percentRate", optionalNumber)}
              />
            </Field>
            <Field id="edit-rule-fixed" label="Montant fixe" error={errors.fixedAmount?.message} hint="Un taux et/ou un montant fixe est requis.">
              <Input id="edit-rule-fixed" type="number" inputMode="numeric" min={0} aria-invalid={Boolean(errors.fixedAmount)} {...register("fixedAmount", optionalNumber)} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={revise.isPending || !isDirty}>
              {revise.isPending && <Spinner />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
