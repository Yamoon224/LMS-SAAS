"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useAssignRoles } from "../hooks/useAssignRoles";
import type { AdminUser, AssignRolesValues } from "../schemas/admin-user.schema";
import { assignRolesSchema } from "../schemas/admin-user.schema";

import { RoleCheckboxList } from "./RoleCheckboxList";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Spinner } from "@/components/ui/spinner";

interface AssignRolesDialogProps {
  /** Compte ciblé ; `null` = fermé. */
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}

export function AssignRolesDialog({ user, onOpenChange }: AssignRolesDialogProps) {
  const assignRoles = useAssignRoles(user?.id ?? "");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignRolesValues>({ resolver: zodResolver(assignRolesSchema), defaultValues: { roleIds: [] } });

  useEffect(() => {
    if (user) reset({ roleIds: user.roleIds });
  }, [user, reset]);

  async function onSubmit(values: AssignRolesValues) {
    try {
      await assignRoles.mutateAsync(values);
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rôles de {user?.fullName}</DialogTitle>
          <DialogDescription>Remplace entièrement les rôles affectés à ce compte.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="assign-roles" label="Rôles" required error={errors.roleIds?.message}>
            <Controller
              control={control}
              name="roleIds"
              render={({ field }) => <RoleCheckboxList selectedRoleIds={field.value} onChange={field.onChange} />}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={assignRoles.isPending}>
              {assignRoles.isPending && <Spinner />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
