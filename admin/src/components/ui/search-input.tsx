"use client";

import { Search, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Appelé au clic sur « effacer » ou Échap (par défaut : onValueChange("")). */
  onClear?: () => void;
  /** Active le raccourci « / » (focus) et affiche l'indice visuel. */
  shortcut?: boolean;
  containerClassName?: string;
}

/** Champ de recherche : loupe à gauche, bouton effacer, raccourci « / » facultatif. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { value, onValueChange, onClear, shortcut = false, className, containerClassName, onKeyDown, ...props },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const setRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const clear = React.useCallback(() => {
      if (onClear) onClear();
      else onValueChange("");
      innerRef.current?.focus();
    }, [onClear, onValueChange]);

    React.useEffect(() => {
      if (!shortcut) return;
      function onKey(event: KeyboardEvent) {
        if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
        event.preventDefault();
        innerRef.current?.focus();
      }
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [shortcut]);

    return (
      <div className={cn("group relative w-full", containerClassName)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand"
          aria-hidden="true"
        />
        <input
          ref={setRef}
          type="search"
          value={value}
          autoComplete="off"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented && event.key === "Escape" && value) {
              event.preventDefault();
              clear();
            }
          }}
          className={cn(
            "flex h-11 w-full rounded-md border border-border bg-surface pl-9 pr-11 text-base shadow-sm transition-colors placeholder:text-muted-foreground/80 hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            className,
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Effacer la recherche"
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7 sm:w-7"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : shortcut ? (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center rounded border border-border bg-surface-muted px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex"
          >
            /
          </kbd>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
