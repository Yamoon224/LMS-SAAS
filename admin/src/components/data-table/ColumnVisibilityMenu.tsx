"use client";

import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ColumnOption {
  id: string;
  header: string;
}

interface ColumnVisibilityMenuProps {
  columns: ColumnOption[];
  hidden: Set<string>;
  onToggle: (columnId: string) => void;
  onReset: () => void;
}

/** Menu « Colonnes » : cases à cocher (clavier : flèches + Espace / Entrée), le menu reste ouvert entre deux bascules. */
export function ColumnVisibilityMenu({ columns, hidden, onToggle, onReset }: ColumnVisibilityMenuProps) {
  if (columns.length === 0) return null;
  const visibleCount = columns.filter((column) => !hidden.has(column.id)).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" aria-label="Choisir les colonnes affichées">
          <Columns3 className="h-4 w-4" aria-hidden="true" />
          Colonnes
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
        {columns.map((column) => {
          const checked = !hidden.has(column.id);
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={checked}
              // Garde au moins une colonne masquable visible : la dernière colonne cochée ne peut pas être décochée.
              disabled={checked && visibleCount === 1}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => onToggle(column.id)}
            >
              {column.header}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onReset}>Réinitialiser</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
