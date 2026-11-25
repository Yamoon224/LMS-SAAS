"use client";

import { useState } from "react";

import { useBusinessUserActions } from "../hooks/useBusinessUsers";
import type { BusinessUser, Role } from "../schemas/user.schema";

import { RoleCheckboxes } from "./RoleCheckboxes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface AssignRolesDialogProps {
  user: BusinessUser;
  roles: Role[];
  onClose: () => void;
}

/** Modification des rôles d'un utilisateur interne (ENT-10). Monté par utilisateur (`key`), état local initialisé à l'ouverture. */
export function AssignRolesDialog({ user, roles, onClose }: AssignRolesDialogProps) {
  const { assignRoles } = useBusinessUserActions();
  const [selected, setSelected] = useState<string[]>(user.roleIds);

  async function save() {
    try {
      await assignRoles.mutateAsync({ userId: user.id, roleIds: selected });
      onClose();
    } catch {
      // toast d'erreur géré globalement
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les rôles</DialogTitle>
          <DialogDescription>{user.fullName ? `${user.fullName} — ${user.email}` : user.email}</DialogDescription>
        </DialogHeader>
        <RoleCheckboxes roles={roles} value={selected} onChange={setSelected} idPrefix="assign-role" />
        {selected.length === 0 && <p className="mt-2 text-xs text-danger">Au moins un rôle est requis.</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={save} disabled={selected.length === 0 || assignRoles.isPending}>
            {assignRoles.isPending && <Spinner />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
