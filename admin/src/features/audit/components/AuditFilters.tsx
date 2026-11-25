"use client";

import { useForm } from "react-hook-form";

import type { AuditFiltersValues } from "../schemas/audit.schema";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";

interface AuditFiltersProps {
  defaultValues: AuditFiltersValues;
  onApply: (values: AuditFiltersValues) => void;
}

const EMPTY: AuditFiltersValues = { actorId: "", objectType: "", objectId: "", action: "", from: "", to: "" };

/** ADM: filtres du journal d'audit (acteur, objet, action, période). */
export function AuditFilters({ defaultValues, onApply }: AuditFiltersProps) {
  const { register, handleSubmit, reset } = useForm<AuditFiltersValues>({ defaultValues });

  function onReset() {
    reset(EMPTY);
    onApply(EMPTY);
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit(onApply)} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" noValidate>
        <Field id="audit-action" label="Action">
          <Input id="audit-action" placeholder="tenant.activated…" {...register("action")} />
        </Field>
        <Field id="audit-objectType" label="Type d’objet">
          <Input id="audit-objectType" placeholder="Tenant, Payout…" {...register("objectType")} />
        </Field>
        <Field id="audit-objectId" label="Objet (ID)">
          <Input id="audit-objectId" placeholder="Identifiant de l’objet" {...register("objectId")} />
        </Field>
        <Field id="audit-actorId" label="Acteur (ID)">
          <Input id="audit-actorId" placeholder="Identifiant de l’acteur" {...register("actorId")} />
        </Field>
        <Field id="audit-from" label="Du">
          <Input id="audit-from" type="date" {...register("from")} />
        </Field>
        <Field id="audit-to" label="Au">
          <Input id="audit-to" type="date" {...register("to")} />
        </Field>

        <div className="col-span-full flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onReset}>
            Réinitialiser
          </Button>
          <Button type="submit">Filtrer</Button>
        </div>
      </form>
    </Card>
  );
}
