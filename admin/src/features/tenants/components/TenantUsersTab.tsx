"use client";

import { Crown, KeyRound, Mail, ShieldOff, UserCheck, UserX, Users } from "lucide-react";
import { useState } from "react";

import { TenantTabState } from "./TenantTabState";
import { TenantUserActionDialog } from "./TenantUserActionDialog";
import type { PendingUserAction } from "./TenantUserActionDialog";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/features/session/hooks/useSession";
import { useTenantUsers } from "@/features/tenants/hooks/useTenantOverview";
import { useTenantUserActions } from "@/features/tenants/hooks/useTenantUserActions";
import type { TenantUser } from "@/features/tenants/schemas/tenant-overview.schema";
import { USER_STATUS_LABELS, USER_STATUS_VARIANTS } from "@/features/tenants/schemas/tenant-overview.schema";
import { availableUserActions } from "@/features/tenants/schemas/tenant-user-actions";
import type { TenantUserActionKind } from "@/features/tenants/schemas/tenant-user-actions";
import { formatDate, formatDateTime } from "@/lib/format";

const ACTION_ITEMS: Record<TenantUserActionKind, { label: string; icon: React.ReactNode; destructive?: boolean }> = {
  suspend: { label: "Suspendre", icon: <UserX />, destructive: true },
  reactivate: { label: "Réactiver", icon: <UserCheck /> },
  resendInvitation: { label: "Renvoyer l’invitation", icon: <Mail /> },
  passwordReset: { label: "Envoyer un lien de réinitialisation", icon: <KeyRound /> },
  reset2fa: { label: "Réinitialiser la 2FA", icon: <ShieldOff />, destructive: true },
  transferOwnership: { label: "Transférer la propriété", icon: <Crown />, destructive: true },
};

function UserActionsMenu({ user, onSelect }: { user: TenantUser; onSelect: (kind: TenantUserActionKind) => void }) {
  const actions = availableUserActions(user);
  if (actions.length === 0) return null;
  return (
    <RowActions label={`Actions pour ${user.fullName}`}>
      {actions.map((kind) => (
        <DropdownMenuItem key={kind} destructive={ACTION_ITEMS[kind].destructive} onSelect={() => onSelect(kind)}>
          {ACTION_ITEMS[kind].icon} {ACTION_ITEMS[kind].label}
        </DropdownMenuItem>
      ))}
    </RowActions>
  );
}

/**
 * ADM-10 / ADM-06 — Utilisateurs : comptes internes (propriétaire, gestionnaires, formateurs), rôles et statuts.
 * Avec `tenants.suspend` : suspendre / réactiver, renvoyer l'invitation, lien de réinitialisation du mot de passe
 * (envoyé par e-mail, jamais affiché), réinitialiser la 2FA, transférer la propriété. Chaque action est confirmée.
 */
export function TenantUsersTab({ tenantId, active }: { tenantId: string; active: boolean }) {
  const query = useTenantUsers(tenantId, active);
  const { can } = usePermissions();
  const canManage = can("tenants.suspend");
  const actions = useTenantUserActions(tenantId);
  const [pending, setPending] = useState<PendingUserAction | null>(null);

  async function confirm(action: PendingUserAction) {
    try {
      await actions[action.kind].mutateAsync(action.user.id);
      setPending(null);
    } catch {
      // toast d'erreur affiché par le MutationCache ; la confirmation reste ouverte
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisateurs internes</CardTitle>
        <CardDescription>
          Les comptes apprenants ne sont pas listés ici : voir « Apprenants » dans la supervision.
          {canManage
            ? " Les actions du menu « ⋯ » sont confirmées puis inscrites au journal d’audit."
            : " Vous n’avez pas la permission d’agir sur ces comptes."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TenantTabState
          query={query}
          errorTitle="Impossible de charger les utilisateurs."
          forbiddenMessage="Vous n’avez pas l’autorisation de consulter les utilisateurs de cette entreprise."
        >
          {(users) =>
            users.length === 0 ? (
              <EmptyState icon={Users} message="Aucun utilisateur interne dans cette entreprise." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Rôles</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                      <TableHead>Créé le</TableHead>
                      {canManage && (
                        <TableHead>
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="break-all">{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              user.roles.map((role) => (
                                <Badge key={role} variant="outline">
                                  {role}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={USER_STATUS_VARIANTS[user.status]}>{USER_STATUS_LABELS[user.status]}</Badge>
                        </TableCell>
                        <TableCell>{user.twoFactorEnabled ? "Activée" : "Non"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(user.lastLoginAt)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(user.createdAt)}</TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <UserActionsMenu user={user} onSelect={(kind) => setPending({ kind, user })} />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <TenantUserActionDialog
                  pending={pending}
                  users={users}
                  isPending={pending ? actions[pending.kind].isPending : false}
                  onCancel={() => setPending(null)}
                  onConfirm={(action) => void confirm(action)}
                />
              </>
            )
          }
        </TenantTabState>
      </CardContent>
    </Card>
  );
}
