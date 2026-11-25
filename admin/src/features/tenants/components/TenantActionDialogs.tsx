"use client";

import { useState } from "react";

import { useActivateTenant } from "../hooks/useActivateTenant";
import { useArchiveTenant } from "../hooks/useArchiveTenant";
import type { Tenant } from "../schemas/tenant.schema";

import { SuspendTenantDialog } from "./SuspendTenantDialog";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type TenantAction = { kind: "activate" | "suspend" | "archive"; tenant: Tenant } | null;

/** État + dialogues partagés par la liste et la fiche : activation (ConfirmDialog) et suspension (motif). */
export function useTenantActionDialogs() {
  const [action, setAction] = useState<TenantAction>(null);
  const activateTenant = useActivateTenant();
  const archiveTenant = useArchiveTenant();

  async function confirmActivate() {
    if (action?.kind !== "activate") return;
    try {
      await activateTenant.mutateAsync(action.tenant.id);
      setAction(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  async function confirmArchive() {
    if (action?.kind !== "archive") return;
    try {
      await archiveTenant.mutateAsync(action.tenant.id);
      setAction(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const isReactivation = action?.kind === "activate" && action.tenant.status === "SUSPENDED";
  const name = action?.tenant.name ?? "cette entreprise";

  const dialogs = (
    <>
      <ConfirmDialog
        open={action?.kind === "activate"}
        onOpenChange={(open) => !open && setAction(null)}
        title={isReactivation ? `Réactiver ${name} ?` : `Activer ${name} ?`}
        description={
          isReactivation
            ? "La suspension est levée : l’entreprise et ses utilisateurs retrouvent l’accès au back-office et à l’espace apprenant."
            : "L’entreprise passe de brouillon à active : son back-office et son espace apprenant deviennent accessibles. Tant qu’elle n’est pas activée, aucun accès n’est résolu."
        }
        confirmLabel={isReactivation ? "Réactiver l’entreprise" : "Activer l’entreprise"}
        destructive={false}
        onConfirm={() => void confirmActivate()}
        isPending={activateTenant.isPending}
      />
      <ConfirmDialog
        open={action?.kind === "archive"}
        onOpenChange={(open) => !open && setAction(null)}
        title={`Archiver ${name} ?`}
        description="L’archivage est définitif : l’entreprise ne peut plus être réactivée, ses accès sont fermés et elle disparaît des opérations courantes. Ses données (formations, paiements, journal d’audit) sont conservées."
        confirmLabel="Archiver définitivement"
        onConfirm={() => void confirmArchive()}
        isPending={archiveTenant.isPending}
      />
      <SuspendTenantDialog
        tenant={action?.kind === "suspend" ? action.tenant : null}
        onOpenChange={(open) => !open && setAction(null)}
      />
    </>
  );

  return { setAction, dialogs };
}
