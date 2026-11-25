"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { useEnabledLanguages, useUpdateProfile } from "../hooks/useProfile";
import { createProfileFormSchema } from "../schemas/profile.schema";
import type { Profile, ProfileFormValues } from "../schemas/profile.schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { useCopy } from "@/lib/i18n/client";
import { isLocale, LOCALE_COOKIE, LOCALE_NAMES, LOCALES } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

interface LocaleOption {
  code: string;
  label: string;
}

/**
 * Langues proposées : celles activées par la plateforme (ADM-40), ou la liste statique si elle est indisponible.
 * La langue actuelle du profil reste visible même si elle a été désactivée depuis, pour ne pas sembler changer seule.
 */
function localeOptions(
  copy: Copy,
  enabled: { code: string; nativeName: string }[] | undefined,
  current: string,
): LocaleOption[] {
  const base: LocaleOption[] = enabled
    ? enabled.map((language) => ({ code: language.code, label: language.nativeName }))
    : LOCALES.map((code) => ({ code, label: LOCALE_NAMES[code] }));
  if (base.some((option) => option.code === current)) return base;
  const known = isLocale(current) ? LOCALE_NAMES[current] : undefined;
  return [...base, { code: current, label: known ? `${known} (${copy.profile.localeDisabled})` : current }];
}

/** PUB-04 : modification du nom, du téléphone et de la langue préférée. L'e-mail reste en lecture seule. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const copy = useCopy();
  const router = useRouter();
  const resolver = useMemo(() => zodResolver(createProfileFormSchema(copy)), [copy]);
  const updateProfile = useUpdateProfile();
  const languages = useEnabledLanguages();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver,
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      locale: isLocale(profile.locale) ? profile.locale : "fr",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      await updateProfile.mutateAsync({ values, currentLocale: profile.locale });
      toast.success(copy.profile.saved);
      document.cookie = `${LOCALE_COOKIE}=${values.locale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : copy.profile.saveFailed);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="email">{copy.profile.email}</Label>
        <Input id="email" type="email" placeholder={copy.placeholders.email} value={profile.email} readOnly aria-describedby="email-hint" />
        <p id="email-hint" className="mt-1 text-xs text-subtle">
          {copy.profile.emailHint}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">{copy.profile.firstName}</Label>
          <Input
            id="firstName"
            placeholder={copy.placeholders.firstName}
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            {...register("firstName")}
          />
          <FieldError id="firstName" message={errors.firstName?.message} />
        </div>
        <div>
          <Label htmlFor="lastName">{copy.profile.lastName}</Label>
          <Input
            id="lastName"
            placeholder={copy.placeholders.lastName}
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            {...register("lastName")}
          />
          <FieldError id="lastName" message={errors.lastName?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="phone">{copy.profile.phone}</Label>
        <Input
          id="phone"
          placeholder={copy.placeholders.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          {...register("phone")}
        />
        <FieldError id="phone" message={errors.phone?.message} />
      </div>

      <div>
        <Label htmlFor="locale">{copy.profile.locale}</Label>
        <select
          id="locale"
          aria-describedby="locale-hint"
          className="flex min-h-[44px] w-full rounded-lg border border-line bg-card px-3 py-2 text-base text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
          {...register("locale")}
        >
          {localeOptions(copy, languages.data, profile.locale).map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
        <p id="locale-hint" className="mt-1 text-xs text-subtle">
          {copy.profile.localeHint}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Spinner />}
          {copy.profile.save}
        </Button>
        <p className="text-sm text-subtle">
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            {copy.profile.changePassword}
          </Link>{" "}
          — {copy.profile.changePasswordHint}
        </p>
      </div>
    </form>
  );
}
