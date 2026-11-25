"use client";

import { X } from "lucide-react";

import type { AuditFilters } from "../schemas/audit.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuditFiltersFormProps {
  draft: AuditFilters;
  setDraft: (filters: AuditFilters) => void;
  canReset: boolean;
  onApply: () => void;
  onReset: () => void;
}

/** Formulaire de filtres du journal : action, type d'objet, période. */
export function AuditFiltersForm({ draft, setDraft, canReset, onApply, onReset }: AuditFiltersFormProps) {
  const invalidRange = draft.from !== "" && draft.to !== "" && draft.from > draft.to;
  const text = (key: "action" | "objectType") => ({
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: event.target.value }),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalidRange) onApply();
      }}
      className="grid grid-cols-1 gap-3 rounded-md border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-action">Action</Label>
        <Input id="audit-action" placeholder="ex. payout.executed" {...text("action")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-object">Type d’objet</Label>
        <Input id="audit-object" placeholder="ex. Course" {...text("objectType")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-from">Du</Label>
        <Input
          id="audit-from"
          type="date"
          value={draft.from}
          max={draft.to || undefined}
          onChange={(event) => setDraft({ ...draft, from: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-to">Au</Label>
        <Input
          id="audit-to"
          type="date"
          value={draft.to}
          min={draft.from || undefined}
          onChange={(event) => setDraft({ ...draft, to: event.target.value })}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-4">
        {canReset && (
          <Button type="button" variant="ghost" onClick={onReset}>
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
        <Button type="submit" disabled={invalidRange}>
          Filtrer
        </Button>
      </div>
      {invalidRange && (
        <p role="alert" className="text-xs text-danger sm:col-span-2 lg:col-span-4">
          La date de début doit précéder la date de fin.
        </p>
      )}
    </form>
  );
}
