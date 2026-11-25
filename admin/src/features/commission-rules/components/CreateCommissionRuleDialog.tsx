"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useSetCommissionRule } from "../hooks/useSetCommissionRule";
import type { SetCommissionRuleValues } from "../schemas/commission-rule.schema";
import {
  COMMISSION_SCOPE_LABELS,
  COMMISSION_TYPE_LABELS,
  setCommissionRuleSchema,
} from "../schemas/commission-rule.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { optionalNumber } from "@/lib/forms";

const DEFAULTS: SetCommissionRuleValues = { scope: "GLOBAL", type: "ONLINE" };

interface ScopeTargetFieldsProps {
  control: Control<SetCommissionRuleValues>;
  register: UseFormRegister<SetCommissionRuleValues>;
  errors: FieldErrors<SetCommissionRuleValues>;
  scope: SetCommissionRuleValues["scope"];
}

/** Cible de la règle selon sa portée : plan, entreprise, formation. */
function ScopeTargetFields({ control, register, errors, scope }: ScopeTargetFieldsProps) {
  const { data: plans } = usePlans();
  const { data: tenants } = useTenants();
  return (
    <>
          {scope === "PLAN" && (
            <Field id="rule-plan" label="Plan" required error={errors.planId?.message}>
              <Controller
                control={control}
                name="planId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="rule-plan">
                      <SelectValue placeholder="Choisir un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans ?? []).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          {(scope === "TENANT" || scope === "COURSE") && (
            <Field id="rule-tenant" label="Entreprise" required error={errors.tenantId?.message}>
              <Controller
                control={control}
                name="tenantId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="rule-tenant">
                      <SelectValue placeholder="Choisir une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      {(tenants ?? []).map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          {scope === "COURSE" && (
            <Field id="rule-course" label="Identifiant de la formation" required error={errors.courseId?.message}>
              <Input id="rule-course" placeholder="Identifiant de la formation" {...register("courseId")} />
            </Field>
          )}
    </>
  );
}

/**
 * ADM-15/ADM-16: une règle n'est jamais modifiée en place — ce formulaire crée toujours une nouvelle règle,
 * datée à partir de maintenant (RG-27 : les taux déjà appliqués restent figés).
 */
export function CreateCommissionRuleDialog() {
  const [open, setOpen] = useState(false);
  const setCommissionRule = useSetCommissionRule();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetCommissionRuleValues>({ resolver: zodResolver(setCommissionRuleSchema), defaultValues: DEFAULTS });

  const scope = useWatch({ control, name: "scope" });

  async function onSubmit(values: SetCommissionRuleValues) {
    try {
      await setCommissionRule.mutateAsync(values);
      setOpen(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(DEFAULTS);
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nouvelle règle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle règle de commission</DialogTitle>
          <DialogDescription>
            Priorité de résolution : formation &gt; entreprise &gt; plan &gt; globale. Une nouvelle règle ne modifie
            jamais les commissions déjà appliquées sur des ventes passées.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="rule-scope" label="Portée" required>
              <Controller
                control={control}
                name="scope"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rule-scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMISSION_SCOPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="rule-type" label="Type de vente" required>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rule-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMISSION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <ScopeTargetFields control={control} register={register} errors={errors} scope={scope} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="rule-percent" label="Taux (%)" error={errors.percentRate?.message}>
              <Input
                id="rule-percent"
                placeholder="10"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                {...register("percentRate", optionalNumber)}
              />
            </Field>
            <Field id="rule-fixed" label="Montant fixe" hint="Un taux et/ou un montant fixe est requis.">
              <Input id="rule-fixed" placeholder="5000" type="number" inputMode="numeric" min={0} {...register("fixedAmount", optionalNumber)} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={setCommissionRule.isPending}>
              {setCommissionRule.isPending && <Spinner />}
              Créer la règle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
