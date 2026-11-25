import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  /** Action optionnelle (ex. bouton « Créer »). */
  action?: React.ReactNode;
}

/** État vide d'une liste (icône + message + action facultative). */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-surface px-4 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-brand">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
