"use client";

import { AccessDenied } from "@/components/feedback/AccessDenied";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/session/hooks/useSession";

/** Garde d'interface d'une page : affiche « accès non autorisé » si la permission manque (UX seulement). */
export function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can, isLoading } = usePermissions();
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!can(permission)) return <AccessDenied />;
  return <>{children}</>;
}

/** Affiche les enfants seulement si la permission est détenue. */
export function Can({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : null;
}
