import { Ban, KeyRound, Mail, RotateCcw, UserX } from "lucide-react";

import { ALLOWED_USER_STATUS_TRANSITIONS } from "../schemas/user.schema";
import type { BusinessUser } from "../schemas/user.schema";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";

interface UserRowActionsProps {
  user: BusinessUser;
  canEditRoles: boolean;
  /** Compte de l'utilisateur connecté ou Propriétaire : suspension/désactivation interdites (backend). */
  isProtected: boolean;
  onEditRoles: (user: BusinessUser) => void;
  onResend: (user: BusinessUser) => void;
  onSuspend: (user: BusinessUser) => void;
  onReactivate: (user: BusinessUser) => void;
  onDeactivate: (user: BusinessUser) => void;
}

function availableActions(user: BusinessUser, canEditRoles: boolean, isProtected: boolean) {
  const next = ALLOWED_USER_STATUS_TRANSITIONS[user.status];
  return {
    canResend: user.status === "INVITED",
    canSuspend: next.includes("SUSPENDED") && !isProtected,
    canReactivate: user.status === "SUSPENDED" && next.includes("ACTIVE"),
    canDeactivate: next.includes("DEACTIVATED") && !isProtected,
    // Modifier ses propres rôles / ceux du Propriétaire risque de verrouiller l'entreprise : masqué (UX, le backend l'autorise).
    canEdit: canEditRoles && user.status !== "DEACTIVATED" && !isProtected,
  };
}

function hasSeparator(a: ReturnType<typeof availableActions>): boolean {
  return (a.canSuspend || a.canDeactivate) && (a.canEdit || a.canResend || a.canReactivate);
}

/** Menu d'actions d'une ligne ; n'affiche que les actions valides pour le statut (user-status.ts) et non protégées. */
export function UserRowActions({
  user,
  canEditRoles,
  isProtected,
  onEditRoles,
  onResend,
  onSuspend,
  onReactivate,
  onDeactivate,
}: UserRowActionsProps) {
  const actions = availableActions(user, canEditRoles, isProtected);
  const { canResend, canSuspend, canReactivate, canDeactivate, canEdit } = actions;
  const hasDanger = canSuspend || canDeactivate;
  if (!canResend && !canReactivate && !hasDanger && !canEdit) return null;

  return (
    <RowActions label={`Actions pour ${user.fullName ?? user.email}`}>
      {canEdit && (
        <DropdownMenuItem onSelect={() => onEditRoles(user)}>
          <KeyRound /> Modifier les rôles
        </DropdownMenuItem>
      )}
      {canResend && (
        <DropdownMenuItem onSelect={() => onResend(user)}>
          <Mail /> Renvoyer l’invitation
        </DropdownMenuItem>
      )}
      {canReactivate && (
        <DropdownMenuItem onSelect={() => onReactivate(user)}>
          <RotateCcw /> Réactiver
        </DropdownMenuItem>
      )}
      {hasSeparator(actions) && <DropdownMenuSeparator />}
      {canSuspend && (
        <DropdownMenuItem destructive onSelect={() => onSuspend(user)}>
          <Ban /> Suspendre
        </DropdownMenuItem>
      )}
      {canDeactivate && (
        <DropdownMenuItem destructive onSelect={() => onDeactivate(user)}>
          <UserX /> Désactiver définitivement
        </DropdownMenuItem>
      )}
    </RowActions>
  );
}
