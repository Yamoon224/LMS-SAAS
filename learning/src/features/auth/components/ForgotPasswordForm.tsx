"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordReset } from "../api/auth.api";
import { createForgotPasswordSchema } from "../schemas/auth.schema";
import type { ForgotPasswordValues } from "../schemas/auth.schema";

import { FormField } from "./FormField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCopy } from "@/lib/i18n/client";

/** PUB-04 : demande d'un lien de réinitialisation. La confirmation est identique que le compte existe ou non. */
export function ForgotPasswordForm() {
  const copy = useCopy();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: useMemo(() => zodResolver(createForgotPasswordSchema(copy)), [copy]), defaultValues: { email: "" } });

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);
    try {
      await requestPasswordReset(values.email, copy);
      setSent(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : copy.auth.forgotFailed);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-lg border border-line bg-card p-4 text-sm">
        <p className="font-semibold">{copy.auth.forgotSentTitle}</p>
        <p className="mt-1 text-subtle">{copy.auth.forgotSentHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <FormField id="email" label={copy.auth.email} error={errors.email?.message}>
        <Input
          id="email"
          placeholder={copy.placeholders.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Spinner />}
        {copy.auth.forgotSubmit}
      </Button>
    </form>
  );
}
