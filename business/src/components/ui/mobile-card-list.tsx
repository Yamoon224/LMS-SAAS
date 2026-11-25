import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Liste en cartes empilées pour petits écrans, en pendant d'un <Table> (`hidden md:block`).
 * Usage : <MobileCardList className="md:hidden"> + <MobileCard title=… meta=… actions=…>.
 */
export function MobileCardList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-3", className)} {...props} />;
}

interface MobileCardProps {
  title: React.ReactNode;
  /** Badge(s) de statut à droite du titre. */
  status?: React.ReactNode;
  /** Paires libellé / valeur affichées en grille 2 colonnes. */
  fields?: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
}

export function MobileCard({ title, status, fields, actions }: MobileCardProps) {
  return (
    <li className="rounded-md border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 break-words text-sm font-medium">{title}</div>
        <div className="flex shrink-0 items-center gap-1">
          {status}
          {actions}
        </div>
      </div>
      {fields && fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="break-words">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
