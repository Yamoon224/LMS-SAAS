"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { login } from "../api/auth.api";
import { createLoginSchema } from "../schemas/auth.schema";
import type { LoginFormValues } from "../schemas/auth.schema";

import { FormField } from "./FormField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useCopy } from "@/lib/i18n/client";

/** Ne redirige que vers un chemin interne (évite les open redirects via ?from=). */
function safeRedirect(from: string | null): string {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : "/my-learning";
}

export function LoginForm() {
  const copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: useMemo(() => zodResolver(createLoginSchema(copy)), [copy]),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values, copy);
      router.push(safeRedirect(searchParams.get("from")));
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : copy.auth.invalid);
    }
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
      <FormField id="password" label={copy.auth.password} error={errors.password?.message}>
        <PasswordInput
          id="password"
          placeholder={copy.placeholders.password}
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Spinner />}
        {copy.auth.submit}
      </Button>
    </form>
  );
}
