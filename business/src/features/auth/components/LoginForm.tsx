"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { login } from "../api/auth.api";
import type { LoginStep } from "../api/auth.api";
import type { LoginFormValues } from "../schemas/login.schema";
import { loginSchema } from "../schemas/login.schema";

import { TwoFactorEnrollment } from "./TwoFactorEnrollment";
import { TwoFactorVerifyForm } from "./TwoFactorVerifyForm";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<Exclude<LoginStep, "done"> | "credentials">("credentials");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const enterApplication = useCallback(() => {
    const redirectTo = searchParams.get("from") ?? "/";
    router.push(redirectTo);
    router.refresh();
  }, [router, searchParams]);

  const restart = useCallback(() => {
    setServerError(null);
    setStep("credentials");
  }, []);

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const next = await login(values);
      if (next === "done") enterApplication();
      else setStep(next);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Connexion impossible.");
    }
  }

  if (step === "verify") return <TwoFactorVerifyForm onSuccess={enterApplication} onRestart={restart} />;
  if (step === "enroll") return <TwoFactorEnrollment onComplete={enterApplication} onRestart={restart} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="email" label="E-mail" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="gestionnaire@entreprise.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field id="password" label="Mot de passe" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting && <Spinner />}
        Se connecter
      </Button>
      <Link href="/forgot-password" className="text-center text-sm text-muted-foreground hover:text-brand">
        Mot de passe oublié ?
      </Link>
    </form>
  );
}
