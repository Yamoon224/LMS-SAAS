"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { resetPassword } from "../api/auth.api";
import { createActivateSchema } from "../schemas/auth.schema";
import type { ActivateFormValues } from "../schemas/auth.schema";

import { FormField } from "./FormField";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { useCopy } from "@/lib/i18n/client";

/** PUB-04 : choix du nouveau mot de passe depuis `/reset-password?token=…` (POST /auth/reset-password). */
export function ResetPasswordForm() {
  const copy = useCopy();
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateFormValues>({
    resolver: useMemo(() => zodResolver(createActivateSchema(copy)), [copy]),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {copy.auth.resetMissingToken}{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          {copy.auth.resetAskAgain}
        </Link>
      </p>
    );
  }

  async function onSubmit(values: ActivateFormValues) {
    setServerError(null);
    try {
      await resetPassword(token as string, values.password, copy);
      toast.success(copy.auth.resetDone);
      router.push("/login");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : copy.auth.resetFailed);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <FormField id="password" label={copy.auth.newPassword} hint={copy.auth.passwordMin} error={errors.password?.message}>
        <PasswordInput
          id="password"
          placeholder={copy.placeholders.password}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
      </FormField>
      <FormField id="confirmPassword" label={copy.auth.confirmPassword} error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          placeholder={copy.placeholders.password}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          {...register("confirmPassword")}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {serverError}{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            {copy.auth.resetAskAgain}
          </Link>
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Spinner />}
        {copy.auth.resetSubmit}
      </Button>
    </form>
  );
}
