import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";

interface ErrorBannerProps {
  title: string;
  error?: unknown;
  /** Si fourni, affiche un bouton « Réessayer ». */
  onRetry?: () => void;
}

/** Bandeau d'erreur de chargement (annoncé aux lecteurs d'écran via role=alert). */
export function ErrorBanner({ title, error, onRetry }: ErrorBannerProps) {
  const detail = error instanceof ApiError || error instanceof Error ? error.message : null;
  return (
    <div
      className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {detail && <p className="mt-1 break-words text-danger/80">{detail}</p>}
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
