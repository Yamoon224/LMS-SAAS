"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useManualEnrollment } from "../hooks/useManualEnrollment";
import type { ManualEnrollmentValues } from "../schemas/enrollment.schema";
import { manualEnrollmentSchema } from "../schemas/enrollment.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api-client";

const DEFAULTS: ManualEnrollmentValues = { email: "", firstName: "", lastName: "", reason: "" };

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/**
 * Inscription manuelle sans paiement (ENT-62). L'apprenant est retrouvé par e-mail ; s'il est inconnu, son prénom et son
 * nom servent à l'inviter (e-mail d'activation). Le motif est obligatoire et conservé comme trace.
 */
export function ManualEnrollmentDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const enroll = useManualEnrollment(courseId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualEnrollmentValues>({ resolver: zodResolver(manualEnrollmentSchema), defaultValues: DEFAULTS });

  async function onSubmit(values: ManualEnrollmentValues) {
    setSubmitError(null);
    try {
      const result = await enroll.mutateAsync(values);
      if (result.invited) toast.info("Un e-mail d'invitation a été envoyé à l'apprenant.");
      reset(DEFAULTS);
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Inscription impossible.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Inscrire un apprenant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscrire un apprenant sans paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="manual-email" label="Adresse e-mail" error={errors.email?.message}>
            <Input id="manual-email" type="email" autoComplete="off" placeholder="apprenant@exemple.com" {...register("email")} />
          </Field>
          <p className="-mt-2 text-xs text-muted-foreground">Prénom et nom : uniquement si l&apos;apprenant n&apos;a pas encore de compte (il sera invité).</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="manual-first-name" label="Prénom" error={errors.firstName?.message}>
              <Input id="manual-first-name" placeholder="Awa" {...register("firstName")} />
            </Field>
            <Field id="manual-last-name" label="Nom" error={errors.lastName?.message}>
              <Input id="manual-last-name" placeholder="Koné" {...register("lastName")} />
            </Field>
          </div>
          <Field id="manual-reason" label="Motif de l'inscription" error={errors.reason?.message}>
            <Textarea id="manual-reason" rows={3} maxLength={500} placeholder="Ex. : accès offert dans le cadre d'un partenariat." {...register("reason")} />
          </Field>
          {submitError && (
            <p role="alert" className="text-xs text-danger">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Inscrire
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
