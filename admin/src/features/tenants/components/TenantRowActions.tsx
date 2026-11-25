"use client";

import { Archive, Ban, Eye, Play, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Tenant } from "../schemas/tenant.schema";

import type { TenantAction } from "./TenantActionDialogs";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { usePermissions } from "@/features/session/hooks/useSession";

/** Menu « ⋯ » d'une entreprise : fiche, activer / réactiver, suspendre (selon statut et permissions). */
export function TenantRowActions({
  tenant,
  onAction,
}: {
  tenant: Tenant;
  onAction: (action: NonNullable<TenantAction>) => void;
}) {
  const router = useRouter();
  const { can } = usePermissions();
  const canActivate = (tenant.status === "DRAFT" || tenant.status === "SUSPENDED") && can("tenants.activate");
  const canSuspend = tenant.status === "ACTIVE" && can("tenants.suspend");
  const canArchive = (tenant.status === "ACTIVE" || tenant.status === "SUSPENDED") && can("tenants.suspend");

  return (
    <RowActions label={`Actions pour ${tenant.name}`}>
      <DropdownMenuItem onSelect={() => router.push(`/tenants/${tenant.id}`)}>
        <Eye /> Voir la fiche
      </DropdownMenuItem>
      {canActivate && (
        <DropdownMenuItem onSelect={() => onAction({ kind: "activate", tenant })}>
          {tenant.status === "SUSPENDED" ? <RotateCcw /> : <Play />}
          {tenant.status === "SUSPENDED" ? "Réactiver" : "Activer"}
        </DropdownMenuItem>
      )}
      {canSuspend && (
        <DropdownMenuItem destructive onSelect={() => onAction({ kind: "suspend", tenant })}>
          <Ban /> Suspendre
        </DropdownMenuItem>
      )}
      {canArchive && (
        <DropdownMenuItem destructive onSelect={() => onAction({ kind: "archive", tenant })}>
          <Archive /> Archiver
        </DropdownMenuItem>
      )}
    </RowActions>
  );
}
