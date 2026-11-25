"use client";

import { Search, X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: string;
  /** Appelé avec la nouvelle valeur ; `""` à l'effacement. */
  onValueChange: (value: string) => void;
  clearLabel?: string;
  wrapperClassName?: string;
}

/** Champ de recherche : loupe, bouton d'effacement quand non vide, focus cohérent avec Input. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, clearLabel = "Effacer la recherche", wrapperClassName, className, ...props }, ref) => (
    <div className={cn("group relative w-full", wrapperClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        autoComplete="off"
        className={cn("pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden", className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={clearLabel}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  ),
);
SearchInput.displayName = "SearchInput";
