"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useInviteLearner } from "../hooks/useBusinessUsers";
import { inviteLearnerSchema, LOCALE_OPTIONS } from "../schemas/user.schema";
import type { InviteLearnerValues } from "../schemas/user.schema";

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
import { ApiError } from "@/lib/api-client";

/** Invitation d'un apprenant (compte LEARNER, rôle « Apprenant » imposé par le backend). */
export function InviteLearnerDialog() {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const invite = useInviteLearner();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteLearnerValues>({
    resolver: zodResolver(inviteLearnerSchema),
    defaultValues: { email: "", firstName: "", lastName: "", phone: "", locale: "fr" },
  });

  async function onSubmit(values: InviteLearnerValues) {
    setServerError(null);
    try {
      await invite.mutateAsync(values);
      reset();
      setOpen(false);
    } catch (error) {
      // Erreur affichée en ligne (pas de doublon avec un toast : voir meta.inlineError).
      setServerError(
        error instanceof ApiError && error.code === "EMAIL_DEJA_UTILISE"
          ? "Cette adresse e-mail est déjà utilisée."
          : error instanceof Error
            ? error.message
            : "L’invitation a échoué.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Inviter un apprenant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un apprenant</DialogTitle>
          <DialogDescription>
            Un e-mail d’activation est envoyé : l’apprenant définit son mot de passe, puis vous pouvez l’inscrire à
            une formation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="learner-firstName" label="Prénom" required error={errors.firstName?.message}>
              <Input id="learner-firstName" placeholder="Awa" autoComplete="off" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
            </Field>
            <Field id="learner-lastName" label="Nom" required error={errors.lastName?.message}>
              <Input id="learner-lastName" placeholder="Koné" autoComplete="off" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
            </Field>
          </div>
          <Field id="learner-email" label="E-mail" required error={errors.email?.message}>
            <Input id="learner-email" placeholder="exemple@entreprise.com" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register("email")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="learner-phone" label="Téléphone" hint="Facultatif, format international." error={errors.phone?.message}>
              <Input id="learner-phone" type="tel" placeholder="+2250700000000" {...register("phone")} />
            </Field>
            <Field id="learner-locale" label="Langue">
              <Controller
                control={control}
                name="locale"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="learner-locale">
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

          {serverError && (
            <p role="alert" className="text-sm text-danger">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Spinner />}
              Envoyer l’invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
