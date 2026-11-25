"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/search-input";

interface DataTableToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** 0 = immédiat (mode client) ; 300 en mode serveur. */
  debounceMs?: number;
  showSearch?: boolean;
  filters?: React.ReactNode;
  /** Boutons (actions de page, colonnes, exports). */
  actions?: React.ReactNode;
}

export function DataTableToolbar({
  value,
  onChange,
  placeholder,
  debounceMs = 0,
  showSearch = true,
  filters,
  actions,
}: DataTableToolbarProps) {
  const inputId = useId();
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Synchronise quand la valeur change de l'extérieur (ex. « Effacer la recherche »).
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const emit = (next: string, immediate = false) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs > 0 && !immediate) {
      timer.current = setTimeout(() => onChangeRef.current(next), debounceMs);
    } else {
      onChangeRef.current(next);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {(showSearch || actions) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {showSearch && (
            <div className="w-full lg:max-w-sm lg:flex-1">
              <label htmlFor={inputId} className="sr-only">
                {placeholder}
              </label>
              <SearchInput
                id={inputId}
                value={local}
                onValueChange={(next) => emit(next, next === "")}
                placeholder={placeholder}
              />
            </div>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{actions}</div>}
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    </div>
  );
}
