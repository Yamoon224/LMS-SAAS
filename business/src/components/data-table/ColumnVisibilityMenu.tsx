"use client";

import { Check, Columns3 } from "lucide-react";

import type { DataTableColumn } from "./types";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnVisibilityMenuProps<T> {
  columns: DataTableColumn<T>[];
  hidden: string[];
  onToggle: (columnId: string) => void;
  onShowAll: () => void;
}

export function ColumnVisibilityMenu<T>({ columns, hidden, onToggle, onShowAll }: ColumnVisibilityMenuProps<T>) {
  const hideable = columns.filter((c) => c.hideable !== false);
  if (hideable.length === 0) return null;
  const visibleCount = columns.length - hidden.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          <Columns3 className="h-4 w-4" aria-hidden="true" />
          Colonnes
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
        {hideable.map((column) => {
          const checked = !hidden.includes(column.id);
          return (
            <DropdownMenuItem
              key={column.id}
              role="menuitemcheckbox"
              aria-checked={checked}
              disabled={checked && visibleCount <= 1}
              onSelect={(event) => {
                event.preventDefault();
                onToggle(column.id);
              }}
            >
              <span className="flex h-4 w-4 items-center justify-center">{checked && <Check aria-hidden="true" />}</span>
              {column.header}
            </DropdownMenuItem>
          );
        })}
        {hidden.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onShowAll();
              }}
            >
              Tout afficher
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
