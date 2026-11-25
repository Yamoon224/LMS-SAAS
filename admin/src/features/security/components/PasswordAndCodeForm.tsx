"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { passwordAndCodeSchema } from "@/features/auth/schemas/two-factor.schema";
import type { PasswordAndCodeValues } from "@/features/auth/schemas/two-factor.schema";

interface PasswordAndCodeFormProps {
  submitLabel: string;
  destructive?: boolean;
  isPending: boolean;
  onSubmit: (values: PasswordAndCodeValues) => void;
  onCancel: () => void;
}

/** Confirmation d'une action sensible : mot de passe actuel + code (TOTP ou de récupération). */
export function PasswordAndCodeForm({ submitLabel, destructive, isPending, onSubmit, onCancel }: PasswordAndCodeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordAndCodeValues>({ resolver: zodResolver(passwordAndCodeSchema), defaultValues: { password: "", code: "" } });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="sec-password" label="Mot de passe actuel" error={errors.password?.message}>
        <PasswordInput id="sec-password" autoComplete="current-password" placeholder="••••••••" aria-invalid={Boolean(errors.password)} {...register("password")} />
      </Field>
      <Field id="sec-code" label="Code de vérification" hint="Code à 6 chiffres, ou code de récupération." error={errors.code?.message}>
        <Input id="sec-code" placeholder="123456" autoComplete="one-time-code" maxLength={12} aria-invalid={Boolean(errors.code)} {...register("code")} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={isPending}>
          {isPending && <Spinner />}
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
