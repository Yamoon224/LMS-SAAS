"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { useInviteAdminUser } from "../hooks/useInviteAdminUser";
import type { InviteAdminUserValues } from "../schemas/admin-user.schema";
import { inviteAdminUserSchema } from "../schemas/admin-user.schema";

import { RoleCheckboxList } from "./RoleCheckboxList";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, StickyFormBar } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export function InviteAdminUserForm() {
  const router = useRouter();
  const inviteAdminUser = useInviteAdminUser();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteAdminUserValues>({
    resolver: zodResolver(inviteAdminUserSchema),
    defaultValues: { email: "", firstName: "", lastName: "", phone: "", locale: "fr", roleIds: [] },
  });

  async function onSubmit(values: InviteAdminUserValues) {
    try {
      await inviteAdminUser.mutateAsync(values);
      router.push("/admin-users");
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Compte administrateur plateforme</CardTitle>
          <p className="text-sm text-muted-foreground">Un lien d’activation est envoyé par e-mail.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="email" label="E-mail" required error={errors.email?.message} className="sm:col-span-2">
            <Input id="email" type="email" autoComplete="off" placeholder="admin@plateforme.com" aria-invalid={Boolean(errors.email)} {...register("email")} />
          </Field>
          <Field id="firstName" label="Prénom" required error={errors.firstName?.message}>
            <Input id="firstName" autoComplete="off" placeholder="Awa" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
          </Field>
          <Field id="lastName" label="Nom" required error={errors.lastName?.message}>
            <Input id="lastName" autoComplete="off" placeholder="Kouassi" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
          </Field>
          <Field id="phone" label="Téléphone" hint="Facultatif, format international.">
            <Input id="phone" type="tel" placeholder="+2250700000000" {...register("phone")} />
          </Field>
          <Field id="locale" label="Langue" error={errors.locale?.message}>
            <Controller
              control={control}
              name="locale"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="locale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((locale) => (
                      <SelectItem key={locale.value} value={locale.value}>
                        {locale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rôles</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id="roles" label="Rôles à attribuer" required error={errors.roleIds?.message}>
            <Controller
              control={control}
              name="roleIds"
              render={({ field }) => <RoleCheckboxList selectedRoleIds={field.value} onChange={field.onChange} />}
            />
          </Field>
        </CardContent>
      </Card>

      <StickyFormBar>
        <Button type="button" variant="outline" onClick={() => router.push("/admin-users")}>
          Annuler
        </Button>
        <Button type="submit" disabled={inviteAdminUser.isPending}>
          {inviteAdminUser.isPending && <Spinner />}
          Envoyer l’invitation
        </Button>
      </StickyFormBar>
    </form>
  );
}
