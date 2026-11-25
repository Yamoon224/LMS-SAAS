"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";

/** États communs d'un onglet de la fiche 360° : chargement, accès refusé (403), erreur avec réessai, puis contenu. */
export function TenantTabState<T>({
  query,
  errorTitle,
  forbiddenMessage,
  children,
}: {
  query: UseQueryResult<T, unknown>;
  errorTitle: string;
  forbiddenMessage: string;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Chargement">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (query.isError) {
    if (isForbidden(query.error)) return <AccessDenied message={forbiddenMessage} />;
    return <ErrorBanner title={errorTitle} error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}

/** Libellé / valeur d'une grille `<dl>`. */
export function InfoField({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "break-all font-mono text-xs" : "break-words text-sm font-medium"}>{children}</dd>
    </div>
  );
}
