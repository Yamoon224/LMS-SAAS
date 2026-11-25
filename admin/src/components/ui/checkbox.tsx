import { Check, Minus } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** État indéterminé (« tout sélectionner » partiel). */
  indeterminate?: boolean;
}

/**
 * Case à cocher native stylée (compatible react-hook-form : `register`, `onChange`, `checked`).
 * Zone tactile élargie via un pseudo-élément ; coche animée ; état indéterminé.
 * `className` s'applique au conteneur (taille/marges).
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate = false, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
      <span className={cn("relative inline-flex h-5 w-5 shrink-0 items-center justify-center", className)}>
        <input
          type="checkbox"
          ref={setRef}
          aria-checked={indeterminate ? "mixed" : undefined}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border bg-surface shadow-sm transition-all duration-150 before:absolute before:-inset-3 before:content-[''] hover:border-brand/60 checked:border-brand checked:bg-brand indeterminate:border-brand indeterminate:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger"
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-brand-foreground opacity-0 transition-all duration-150 peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:scale-50 peer-indeterminate:opacity-0"
        />
        <Minus
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-brand-foreground opacity-0 transition-all duration-150 peer-indeterminate:scale-100 peer-indeterminate:opacity-100"
        />
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
