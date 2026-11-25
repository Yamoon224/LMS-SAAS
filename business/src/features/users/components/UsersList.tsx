"use client";

import { Users } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { USER_STATUS_LABELS } from "../schemas/user.schema";
import type { BusinessUser } from "../schemas/user.schema";

import { RoleBadges } from "./RoleBadges";
import { UserStatusBadge } from "./UserStatusBadge";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";

interface UsersListProps {
  users: BusinessUser[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  roleNames: Map<string, string>;
  currentUserId?: string;
  renderActions: (user: BusinessUser) => ReactNode;
}

function Identity({ user, isSelf }: { user: BusinessUser; isSelf: boolean }) {
  return (
    <>
      <p className="font-medium">
        {user.fullName || user.email}
        {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(vous)</span>}
      </p>
      {user.fullName && <p className="text-xs font-normal text-muted-foreground">{user.email}</p>}
    </>
  );
}

/** DataTable des utilisateurs internes (tableau ≥ md, cartes en mobile). */
export function UsersList({ users, isLoading, error, onRetry, roleNames, currentUserId, renderActions }: UsersListProps) {
  const columns = useMemo<DataTableColumn<BusinessUser>[]>(
    () => [
      {
        id: "user",
        header: "Utilisateur",
        accessor: (user) => `${user.fullName ?? ""} ${user.email}`.trim(),
        exportValue: (user) => (user.fullName ? `${user.fullName} <${user.email}>` : user.email),
        cell: (user) => <Identity user={user} isSelf={user.id === currentUserId} />,
        hideable: false,
        mobile: "primary",
      },
      {
        id: "roles",
        header: "Rôles",
        accessor: (user) => user.roleIds.map((id) => roleNames.get(id) ?? "Rôle").join(", "),
        cell: (user) => <RoleBadges user={user} roleNames={roleNames} />,
      },
      {
        id: "status",
        header: "Statut",
        accessor: (user) => USER_STATUS_LABELS[user.status],
        cell: (user) => <UserStatusBadge status={user.status} />,
      },
    ],
    [roleNames, currentUserId],
  );

  return (
    <DataTable
      data={users}
      columns={columns}
      getRowId={(user) => user.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      title="utilisateurs"
      stateKey="users"
      searchPlaceholder="Rechercher un utilisateur…"
      rowActions={renderActions}
      emptyState={<EmptyState icon={Users} message="Aucun utilisateur pour le moment." />}
    />
  );
}
