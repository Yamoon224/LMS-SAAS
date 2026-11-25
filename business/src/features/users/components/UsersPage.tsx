"use client";

import { useMemo, useState } from "react";

import { useBusinessRoles, useBusinessUserActions, useBusinessUsers } from "../hooks/useBusinessUsers";
import { isOwnerRole } from "../schemas/user.schema";
import type { BusinessUser } from "../schemas/user.schema";

import { AssignRolesDialog } from "./AssignRolesDialog";
import { InviteUserDialog } from "./InviteUserDialog";
import { UserRowActions } from "./UserRowActions";
import { UsersList } from "./UsersList";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { useSession } from "@/features/session/hooks/useSession";

function displayName(user: BusinessUser | null): string {
  return user?.fullName || user?.email || "";
}

/** Utilisateurs & rôles (ENT-10) : liste, invitation, renvoi, suspension / réactivation / désactivation, rôles. */
export function UsersPage() {
  const { data: users, isLoading, isError, error, refetch } = useBusinessUsers();
  const { data: roles } = useBusinessRoles();
  const { session } = useSession();
  const { resend, suspend, reactivate, deactivate } = useBusinessUserActions();
  const [rolesTarget, setRolesTarget] = useState<BusinessUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<BusinessUser | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<BusinessUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<BusinessUser | null>(null);

  const roleNames = useMemo(() => new Map((roles ?? []).map((role) => [role.id, role.name])), [roles]);
  const ownerRoleIds = new Set((roles ?? []).filter(isOwnerRole).map((role) => role.id));

  /** Soi-même ou Propriétaire : le backend refuse suspension/désactivation (ACTION_INTERDITE_SUR_SOI_OU_PROPRIETAIRE). */
  const isProtected = (user: BusinessUser) =>
    user.id === session?.userId || user.roleIds.some((roleId) => ownerRoleIds.has(roleId));

  const renderActions = (user: BusinessUser) => (
    <UserRowActions
      user={user}
      canEditRoles={Boolean(roles)}
      isProtected={isProtected(user)}
      onEditRoles={setRolesTarget}
      onResend={(target) => resend.mutate(target.id)}
      onSuspend={setSuspendTarget}
      onReactivate={setReactivateTarget}
      onDeactivate={setDeactivateTarget}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Utilisateurs & rôles"
        description="Invitez des gestionnaires et des formateurs, attribuez leurs rôles et gérez leur accès. Les apprenants se gèrent depuis « Apprenants »."
        actions={<InviteUserDialog />}
      />

      <UsersList
        users={users}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        roleNames={roleNames}
        currentUserId={session?.userId}
        renderActions={renderActions}
      />

      {roles && rolesTarget && (
        <AssignRolesDialog key={rolesTarget.id} user={rolesTarget} roles={roles} onClose={() => setRolesTarget(null)} />
      )}

      <ConfirmDialog
        open={suspendTarget !== null}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="Suspendre cet utilisateur ?"
        description={`${displayName(suspendTarget)} perdra l’accès au back-office immédiatement. Vous pourrez le réactiver à tout moment.`}
        confirmLabel="Suspendre"
        isPending={suspend.isPending}
        onConfirm={() => {
          if (!suspendTarget) return;
          suspend.mutate(suspendTarget.id, { onSettled: () => setSuspendTarget(null) });
        }}
      />

      <ConfirmDialog
        open={reactivateTarget !== null}
        onOpenChange={(open) => !open && setReactivateTarget(null)}
        title="Réactiver cet utilisateur ?"
        description={`${displayName(reactivateTarget)} retrouvera l’accès au back-office avec ses rôles actuels.`}
        confirmLabel="Réactiver"
        destructive={false}
        isPending={reactivate.isPending}
        onConfirm={() => {
          if (!reactivateTarget) return;
          reactivate.mutate(reactivateTarget.id, { onSettled: () => setReactivateTarget(null) });
        }}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`Désactiver définitivement ${displayName(deactivateTarget)} ?`}
        description="Contrairement à une suspension (réversible), la désactivation est définitive : ce compte ne pourra plus jamais être réactivé ni se reconnecter. N’utilisez cette action que si ce compte ne doit plus jamais servir."
        confirmLabel="Désactiver définitivement"
        isPending={deactivate.isPending}
        onConfirm={() => {
          if (!deactivateTarget) return;
          deactivate.mutate(deactivateTarget.id, { onSettled: () => setDeactivateTarget(null) });
        }}
      />
    </div>
  );
}
