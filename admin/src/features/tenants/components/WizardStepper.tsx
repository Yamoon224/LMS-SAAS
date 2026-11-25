import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepperItem {
  id: string;
  label: string;
  /** Texte secondaire (ex. « Facultatif »). */
  hint?: string;
}

/**
 * Fil d'étapes : numéros reliés ; une étape déjà franchie reste cliquable pour y revenir, les suivantes ne le
 * sont pas (on les atteint avec « Suivant », qui valide l'étape en cours).
 */
export function WizardStepper({ steps, current, onSelect }: { steps: StepperItem[]; current: number; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="Étapes de création">
      <ol className="flex flex-wrap items-start gap-x-2 gap-y-3 sm:flex-nowrap">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:basis-0">
              <button
                type="button"
                disabled={!done}
                onClick={() => onSelect(index)}
                aria-current={active ? "step" : undefined}
                className="flex min-w-0 items-center gap-2 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    done && "border-brand bg-brand text-brand-foreground",
                    active && "border-brand bg-brand/10 text-brand",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-medium", !active && !done && "text-muted-foreground")}>{step.label}</span>
                  {step.hint && <span className="block truncate text-xs text-muted-foreground">{step.hint}</span>}
                </span>
              </button>
              {index < steps.length - 1 && <span aria-hidden="true" className={cn("hidden h-px flex-1 sm:block", done ? "bg-brand" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
