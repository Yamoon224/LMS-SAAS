import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignBusinessUserRoles,
  deactivateBusinessUser,
  fetchBusinessRoles,
  fetchBusinessUsers,
  fetchTrainers,
  inviteBusinessUser,
  inviteLearner,
  reactivateBusinessUser,
  resendInvitation,
  suspendBusinessUser,
} from "../api/users.api";
import type { InviteLearnerValues, InviteUserValues } from "../schemas/user.schema";

export const businessUsersQueryKey = ["business-users"] as const;
export const businessRolesQueryKey = ["business-roles"] as const;
export const trainersQueryKey = ["business-trainers"] as const;

/** Utilisateurs internes du tenant (ENT-10). */
export function useBusinessUsers() {
  return useQuery({ queryKey: businessUsersQueryKey, queryFn: fetchBusinessUsers });
}

/** Rôles du tenant (invitation, attribution, détection du Propriétaire). */
export function useBusinessRoles() {
  return useQuery({ queryKey: businessRolesQueryKey, queryFn: fetchBusinessRoles, staleTime: 5 * 60_000 });
}

/** Formateurs actifs (id + nom) : accessible avec courses.manage (Gestionnaire inclus). */
export function useTrainers() {
  return useQuery({ queryKey: trainersQueryKey, queryFn: fetchTrainers, staleTime: 60_000 });
}

/** Invitation d'un apprenant (learners.manage). */
export function useInviteLearner() {
  return useMutation({
    meta: { successMessage: "Invitation envoyée à l’apprenant.", inlineError: true },
    mutationFn: (values: InviteLearnerValues) => inviteLearner(values),
  });
}

export function useBusinessUserActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: businessUsersQueryKey });
    void queryClient.invalidateQueries({ queryKey: trainersQueryKey });
  };

  const invite = useMutation({
    meta: { successMessage: "Invitation envoyée." },
    mutationFn: (values: InviteUserValues) => inviteBusinessUser(values),
    onSuccess: invalidate,
  });
  const resend = useMutation({
    meta: { successMessage: "Invitation renvoyée." },
    mutationFn: (userId: string) => resendInvitation(userId),
  });
  const suspend = useMutation({
    meta: { successMessage: "Utilisateur suspendu." },
    mutationFn: (userId: string) => suspendBusinessUser(userId),
    onSuccess: invalidate,
  });
  const reactivate = useMutation({
    meta: { successMessage: "Utilisateur réactivé." },
    mutationFn: (userId: string) => reactivateBusinessUser(userId),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    meta: { successMessage: "Utilisateur désactivé définitivement." },
    mutationFn: (userId: string) => deactivateBusinessUser(userId),
    onSuccess: invalidate,
  });
  const assignRoles = useMutation({
    meta: { successMessage: "Rôles mis à jour." },
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      assignBusinessUserRoles(userId, roleIds),
    onSuccess: invalidate,
  });

  return { invite, resend, suspend, reactivate, deactivate, assignRoles };
}
