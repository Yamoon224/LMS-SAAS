"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useId, useState } from "react";

import { Card } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Légende (≥ 2 séries) affichée sous le titre. */
  legend?: React.ReactNode;
  /** Données du graphique en tableau (vue alternative, accessible, toujours disponible). */
  table: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}

/** Cadre commun des graphiques : titre, légende, bascule graphique ⇄ tableau. */
export function ChartCard({ title, description, legend, table, children, className }: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();

  return (
    <Card className={className} role="figure" aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
        <div className="min-w-0">
          <h3 id={titleId} className="section-title font-display text-base font-semibold">
            {title}
          </h3>
          {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          aria-pressed={asTable}
          title={asTable ? "Afficher le graphique" : "Afficher les données en tableau"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {asTable ? <BarChart3 className="h-4 w-4" aria-hidden="true" /> : <Table2 className="h-4 w-4" aria-hidden="true" />}
          <span className="sr-only">{asTable ? "Afficher le graphique" : "Afficher en tableau"}</span>
        </button>
      </div>
      {legend && <div className="px-4 pt-3 sm:px-5">{legend}</div>}
      <div className="p-4 sm:p-5">
        {asTable ? (
          <div className="max-h-64 overflow-auto">
            <table className="table-sm table-striped w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {table.columns.map((column) => (
                    <th key={column} scope="col" className="py-2 pr-4 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="py-2 pr-4 tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

/** Légende : pastille de la couleur de la série + libellé en encre de texte (le texte ne porte jamais la couleur). */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
