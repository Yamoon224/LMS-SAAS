"use client";

import { Check, Minus } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** État indéterminé (« tout sélectionner » partiel). */
  indeterminate?: boolean;
}

/**
 * Case à cocher native stylée (compatible react-hook-form : register / onChange / checked / ref).
 * `className` s'applique au conteneur ; la cible tactile est étendue (≥ 44px) via un pseudo-élément.
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
      <span
        className={cn(
          "relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center before:absolute before:-inset-3 before:content-[''] before:sm:-inset-2",
          className,
        )}
      >
        <input
          type="checkbox"
          ref={setRef}
          aria-checked={indeterminate ? "mixed" : undefined}
          className="peer h-full w-full cursor-pointer appearance-none rounded-[6px] border border-border bg-surface shadow-sm transition-[background-color,border-color,box-shadow] duration-150 checked:border-brand checked:bg-brand indeterminate:border-brand indeterminate:bg-brand hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger"
          {...props}
        />
        <Check
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none absolute h-3 w-3 scale-50 text-brand-foreground opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:hidden"
        />
        <Minus
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none absolute hidden h-3 w-3 text-brand-foreground peer-indeterminate:block"
        />
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
