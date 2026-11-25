import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tableau : défile DANS son conteneur (jamais la page), 1re colonne collante sur petit écran.
 * Pour des listes en cartes sur mobile, utiliser `MobileCardList`
 * (components/ui/mobile-card-list.tsx) et masquer le tableau avec `hidden md:block`.
 */
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border bg-surface shadow-card">
      <table
        className={cn(
          "table-sm table-striped w-full caption-bottom text-sm [&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:bg-surface [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:bg-brand md:[&_td:first-child]:static md:[&_th:first-child]:static",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-brand-gradient text-brand-foreground [&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border transition-colors hover:bg-accent/50", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-8 whitespace-nowrap px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-1.5 align-middle", className)} {...props} />;
}
