"use client";

import { AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/i18n/client";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: { href: string; label: string };
}

/** État vide cohérent : icône, message chaleureux, action optionnelle. */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-line bg-card px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-sm text-subtle">{message}</p>
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
}

/** Erreur de chargement inline (jamais de page blanche). */
export function ErrorState({ title, detail, onRetry }: ErrorStateProps) {
  const copy = useCopy();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-5 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div>
          <p className="font-semibold text-red-900">{title}</p>
          <p className="mt-1 text-red-800">{detail ?? copy.errors.serviceDown}</p>
        </div>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {copy.common.retry}
        </Button>
      )}
    </div>
  );
}
