"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useBusinessRoles, useBusinessUserActions } from "../hooks/useBusinessUsers";
import { inviteUserSchema, LOCALE_OPTIONS } from "../schemas/user.schema";
import type { InviteUserValues } from "../schemas/user.schema";

import { RoleCheckboxes } from "./RoleCheckboxes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

/** Invitation d'un gestionnaire ou formateur avec attribution de rôles (ENT-10). */
export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const { data: roles, isLoading: rolesLoading, isError: rolesError } = useBusinessRoles();
  const { invite } = useBusinessUserActions();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteUserValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: "", firstName: "", lastName: "", phone: "", locale: "fr", roleIds: [] },
  });

  async function onSubmit(values: InviteUserValues) {
    try {
      await invite.mutateAsync(values);
      reset();
      setOpen(false);
    } catch {
      // toast d'erreur affiché par le MutationCache ; la modale reste ouverte pour correction
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Inviter un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Un e-mail d’activation est envoyé : la personne définit elle-même son mot de passe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="invite-firstName" label="Prénom" required error={errors.firstName?.message}>
              <Input id="invite-firstName" placeholder="Awa" autoComplete="off" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
            </Field>
            <Field id="invite-lastName" label="Nom" required error={errors.lastName?.message}>
              <Input id="invite-lastName" placeholder="Koné" autoComplete="off" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
            </Field>
          </div>
          <Field id="invite-email" label="E-mail" required error={errors.email?.message}>
            <Input id="invite-email" placeholder="exemple@entreprise.com" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register("email")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="invite-phone" label="Téléphone" hint="Facultatif, format international.">
              <Input id="invite-phone" type="tel" placeholder="+2250700000000" {...register("phone")} />
            </Field>
            <Field id="invite-locale" label="Langue">
              <Controller
                control={control}
                name="locale"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invite-locale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field id="invite-roles" label="Rôles" required error={errors.roleIds?.message}>
            {rolesLoading && <Spinner />}
            {rolesError && <p className="text-xs text-danger">Impossible de charger les rôles.</p>}
            {roles && (
              <Controller
                control={control}
                name="roleIds"
                render={({ field }) => (
                  <RoleCheckboxes roles={roles} value={field.value} onChange={field.onChange} idPrefix="invite-role" />
                )}
              />
            )}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={invite.isPending || rolesError}>
              {invite.isPending && <Spinner />}
              Envoyer l’invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
