import type { LucideIcon } from "lucide-react";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";

interface ListFallbackProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  errorTitle: string;
  isEmpty: boolean;
  emptyIcon: LucideIcon;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}

/** Enchaîne chargement → erreur (403 = accès non autorisé) → état vide → contenu. */
export function ListFallback({
  isLoading,
  isError,
  error,
  onRetry,
  errorTitle,
  isEmpty,
  emptyIcon,
  emptyMessage,
  emptyAction,
  children,
}: ListFallbackProps) {
  if (isLoading) return <TableSkeleton />;
  if (isError) {
    if (isForbidden(error)) return <AccessDenied />;
    return <ErrorBanner title={errorTitle} error={error} onRetry={onRetry} />;
  }
  if (isEmpty) return <EmptyState icon={emptyIcon} message={emptyMessage} action={emptyAction} />;
  return <>{children}</>;
}
