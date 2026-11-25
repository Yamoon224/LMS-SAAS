"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/search-input";

interface DataTableToolbarProps {
  search: string;
  onSearchChange: (query: string) => void;
  /** Anti-rebond en ms (300 en mode serveur, 0 en mode client). */
  debounceMs?: number;
  placeholder?: string;
  filters?: React.ReactNode;
  /** Menus colonnes + export. */
  tools?: React.ReactNode;
  toolbarActions?: React.ReactNode;
}

/** Barre d'outils : recherche pleine largeur sur mobile, filtres et actions dans une rangée qui se replie. */
export function DataTableToolbar({
  search,
  onSearchChange,
  debounceMs = 0,
  placeholder = "Rechercher…",
  filters,
  tools,
  toolbarActions,
}: DataTableToolbarProps) {
  const inputId = useId();
  const [value, setValue] = useState(search);
  const lastEmitted = useRef(search);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Synchronise le champ quand la recherche est modifiée de l'extérieur (ex. « Effacer la recherche »).
  useEffect(() => {
    if (search !== lastEmitted.current) {
      lastEmitted.current = search;
      setValue(search);
    }
  }, [search]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function emit(next: string) {
    lastEmitted.current = next;
    onSearchChange(next);
  }

  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    if (debounceMs > 0) timer.current = setTimeout(() => emit(next), debounceMs);
    else emit(next);
  }

  function clear() {
    clearTimeout(timer.current);
    setValue("");
    emit("");
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <div role="search" className="w-full md:max-w-md md:flex-1">
        <label htmlFor={inputId} className="sr-only">
          Rechercher dans la liste
        </label>
        <SearchInput
          id={inputId}
          value={value}
          placeholder={placeholder}
          shortcut
          onValueChange={handleChange}
          onClear={clear}
        />
      </div>

      {/* Mobile : filtres et actions partagent une rangée qui se replie ; dès md ils rejoignent la rangée principale. */}
      <div className="flex flex-wrap items-center gap-2 md:contents">
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          {tools}
          {toolbarActions}
        </div>
      </div>
    </div>
  );
}
