"use client";

import { Ban, KeyRound, Mail, ShieldCheck, ShieldOff, Smartphone, UserCheck } from "lucide-react";
import { useState } from "react";

import { useAdminUsers } from "../hooks/useAdminUsers";
import { useDeactivateAdminUser } from "../hooks/useDeactivateAdminUser";
import { useReactivateAdminUser } from "../hooks/useReactivateAdminUser";
import { useResendInvitation } from "../hooks/useResendInvitation";
import { useResetAdminTwoFactor } from "../hooks/useResetAdminTwoFactor";
import { useSuspendAdminUser } from "../hooks/useSuspendAdminUser";
import type { AdminUser } from "../schemas/admin-user.schema";
import { USER_STATUS_LABELS } from "../schemas/admin-user.schema";

import { AdminUserStatusBadge } from "./AdminUserStatusBadge";
import { AssignRolesDialog } from "./AssignRolesDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { useSession } from "@/features/session/hooks/useSession";

type Pending = { kind: "suspend" | "deactivate" | "reset-2fa"; user: AdminUser } | null;

export function AdminUserList() {
  const { data: users, isLoading, isError, error, refetch } = useAdminUsers();
  const resendInvitation = useResendInvitation();
  const suspendAdminUser = useSuspendAdminUser();
  const reactivateAdminUser = useReactivateAdminUser();
  const deactivateAdminUser = useDeactivateAdminUser();
  const resetTwoFactor = useResetAdminTwoFactor();
  const { data: session } = useSession();
  const [rolesFor, setRolesFor] = useState<AdminUser | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  async function confirmPending() {
    if (!pending) return;
    try {
      if (pending.kind === "suspend") await suspendAdminUser.mutateAsync(pending.user.id);
      else if (pending.kind === "reset-2fa") await resetTwoFactor.mutateAsync(pending.user.id);
      else await deactivateAdminUser.mutateAsync(pending.user.id);
      setPending(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const renderActions = (user: AdminUser) => {
    const canSuspend = user.status === "ACTIVE" || user.status === "INVITED";
    const canDeactivate = user.status === "ACTIVE" || user.status === "SUSPENDED";
    if (user.status === "DEACTIVATED") return null;
    return (
      <RowActions label={`Actions pour ${user.fullName}`}>
        <DropdownMenuItem onSelect={() => setRolesFor(user)}>
          <KeyRound /> Modifier les rôles
        </DropdownMenuItem>
        {user.status === "ACTIVE" && user.id !== session?.userId && (
          <DropdownMenuItem onSelect={() => setPending({ kind: "reset-2fa", user })}>
            <Smartphone /> Réinitialiser la 2FA
          </DropdownMenuItem>
        )}
        {user.status === "INVITED" && (
          <DropdownMenuItem onSelect={() => resendInvitation.mutate(user.id)}>
            <Mail /> Renvoyer l’invitation
          </DropdownMenuItem>
        )}
        {user.status === "SUSPENDED" && (
          <DropdownMenuItem onSelect={() => reactivateAdminUser.mutate(user.id)}>
            <UserCheck /> Réactiver
          </DropdownMenuItem>
        )}
        {canSuspend && (
          <DropdownMenuItem destructive onSelect={() => setPending({ kind: "suspend", user })}>
            <Ban /> Suspendre
          </DropdownMenuItem>
        )}
        {canDeactivate && (
          <DropdownMenuItem destructive onSelect={() => setPending({ kind: "deactivate", user })}>
            <ShieldOff /> Désactiver définitivement
          </DropdownMenuItem>
        )}
      </RowActions>
    );
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "name",
      header: "Nom",
      accessor: (user) => user.fullName,
      cell: (user) => <span className="font-medium">{user.fullName}</span>,
      mobile: "primary",
    },
    {
      id: "email",
      header: "E-mail",
      accessor: (user) => user.email,
      cell: (user) => <span className="text-muted-foreground">{user.email}</span>,
    },
    {
      id: "phone",
      header: "Téléphone",
      accessor: (user) => user.phone ?? null,
      cell: (user) => <span className="text-muted-foreground">{user.phone ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Statut",
      accessor: (user) => USER_STATUS_LABELS[user.status],
      cell: (user) => <AdminUserStatusBadge status={user.status} />,
    },
  ];

  const isDeactivate = pending?.kind === "deactivate";
  const isReset = pending?.kind === "reset-2fa";

  return (
    <>
      <DataTable
        data={users}
        columns={columns}
        getRowId={(user) => user.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger les comptes administrateurs."
        title="comptes-administrateurs"
        searchPlaceholder="Rechercher un nom, un e-mail…"
        stateKey="admin-users"
        initialSort={{ columnId: "name", direction: "asc" }}
        rowActions={renderActions}
        emptyState={<EmptyState icon={ShieldCheck} message="Aucun compte administrateur pour le moment." />}
      />

      <AssignRolesDialog user={rolesFor} onOpenChange={(open) => !open && setRolesFor(null)} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          isReset
            ? `Réinitialiser la double authentification de ${pending?.user.fullName} ?`
            : isDeactivate
              ? `Désactiver définitivement ${pending?.user.fullName} ?`
              : `Suspendre ${pending?.user.fullName} ?`
        }
        description={
          isReset
            ? "Toutes les sessions de ce compte sont fermées et son secret ainsi que ses codes de récupération sont supprimés. Il devra enrôler de nouveau la 2FA à sa prochaine connexion. L’action est inscrite au journal d’audit."
            : isDeactivate
            ? "La désactivation est définitive : ce compte ne pourra plus jamais être réactivé ni se reconnecter. Utilisez la suspension si l’accès doit pouvoir être rétabli."
            : "L’accès est révoqué temporairement ; la suspension est réversible par réactivation."
        }
        confirmLabel={isReset ? "Réinitialiser" : isDeactivate ? "Désactiver définitivement" : "Suspendre"}
        onConfirm={() => void confirmPending()}
        isPending={suspendAdminUser.isPending || deactivateAdminUser.isPending || resetTwoFactor.isPending}
      />
    </>
  );
}
