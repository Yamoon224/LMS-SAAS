"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { registerAccount } from "../api/auth.api";
import { createRegisterSchema } from "../schemas/auth.schema";
import type { RegisterFormValues } from "../schemas/auth.schema";

import { FormField } from "./FormField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCopy, useLocale } from "@/lib/i18n/client";

function a11y(id: keyof RegisterFormValues, error?: string) {
  return { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined };
}

/** Auto-inscription : réponse générique (anti-énumération), explication de l'e-mail d'activation. */
export function RegisterForm() {
  const copy = useCopy();
  const locale = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: useMemo(() => zodResolver(createRegisterSchema(copy)), [copy]),
    defaultValues: { email: "", firstName: "", lastName: "", phone: "" },
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await registerAccount(
        {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        ...(values.phone ? { phone: values.phone.replace(/[ ().-]/g, "") } : {}),
        },
        copy,
        locale,
      );
      setDoneEmail(values.email);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : copy.auth.registerFailed);
    }
  }

  if (doneEmail) {
    return (
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold tracking-tight">{copy.auth.registerDoneTitle}</h1>
        <p className="text-sm text-subtle">{copy.auth.registerDoneBody}</p>
        <p className="w-full break-all rounded-lg bg-canvas p-3 text-sm font-medium">{doneEmail}</p>
        <p className="text-xs text-subtle">{copy.auth.registerDoneHint}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{copy.nav.login}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{copy.auth.registerTitle}</h1>
      <p className="mb-6 mt-2 text-sm text-subtle">{copy.auth.registerSubtitle}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField id="firstName" label={copy.auth.firstName} error={errors.firstName?.message}>
            <Input placeholder={copy.placeholders.firstName} autoComplete="given-name" {...a11y("firstName", errors.firstName?.message)} {...register("firstName")} />
          </FormField>
          <FormField id="lastName" label={copy.auth.lastName} error={errors.lastName?.message}>
            <Input placeholder={copy.placeholders.lastName} autoComplete="family-name" {...a11y("lastName", errors.lastName?.message)} {...register("lastName")} />
          </FormField>
        </div>
        <FormField id="email" label={copy.auth.email} error={errors.email?.message}>
          <Input type="email" placeholder={copy.placeholders.email} inputMode="email" autoComplete="email" {...a11y("email", errors.email?.message)} {...register("email")} />
        </FormField>
        <FormField id="phone" label={copy.auth.phone} hint={copy.auth.phoneHint} error={errors.phone?.message}>
          <Input type="tel" placeholder={copy.placeholders.phone} inputMode="tel" autoComplete="tel" {...a11y("phone", errors.phone?.message)} {...register("phone")} />
        </FormField>

        {serverError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {copy.auth.registerSubmit}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-subtle">
        {copy.auth.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {copy.nav.login}
        </Link>
      </p>
    </>
  );
}
