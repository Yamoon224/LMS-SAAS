"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useSaveContacts } from "../hooks/useSettings";
import { contactsFormSchema } from "../schemas/settings.schema";
import type { ContactsFormInput, ContactsFormValues, TenantSettings } from "../schemas/settings.schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function toDefaults(settings: TenantSettings): ContactsFormInput {
  return {
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    legalName: settings.legalInfo.legalName ?? "",
    registrationNumber: settings.legalInfo.registrationNumber ?? "",
    taxId: settings.legalInfo.taxId ?? "",
    address: settings.legalInfo.address ?? "",
  };
}

/** ENT-08 : coordonnées de contact et informations légales de l'entreprise. */
export function ContactsForm({ settings }: { settings: TenantSettings }) {
  const save = useSaveContacts();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContactsFormInput, unknown, ContactsFormValues>({
    resolver: zodResolver(contactsFormSchema),
    defaultValues: toDefaults(settings),
  });

  useEffect(() => reset(toDefaults(settings)), [settings, reset]);

  async function onSubmit(values: ContactsFormValues) {
    try {
      await save.mutateAsync(values);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts et informations légales</CardTitle>
        <CardDescription>Coordonnées de contact et mentions légales de votre entreprise.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="contactEmail" label="E-mail de contact" error={errors.contactEmail?.message}>
              <Input id="contactEmail" placeholder="contact@entreprise.com" type="email" autoComplete="off" aria-invalid={Boolean(errors.contactEmail)} {...register("contactEmail")} />
            </Field>
            <Field id="contactPhone" label="Téléphone de contact" error={errors.contactPhone?.message}>
              <Input id="contactPhone" placeholder="+2250700000000" type="tel" autoComplete="off" aria-invalid={Boolean(errors.contactPhone)} {...register("contactPhone")} />
            </Field>
            <Field id="legalName" label="Raison sociale" error={errors.legalName?.message}>
              <Input id="legalName" placeholder="Académie Horizon SARL" maxLength={200} {...register("legalName")} />
            </Field>
            <Field id="registrationNumber" label="Numéro d’immatriculation (RCCM…)" error={errors.registrationNumber?.message}>
              <Input id="registrationNumber" placeholder="CI-ABJ-2024-B-12345" maxLength={60} {...register("registrationNumber")} />
            </Field>
            <Field id="taxId" label="Identifiant fiscal" error={errors.taxId?.message}>
              <Input id="taxId" placeholder="1234567 A" maxLength={60} {...register("taxId")} />
            </Field>
            <Field id="address" label="Adresse" error={errors.address?.message}>
              <Input id="address" placeholder="Cocody, Abidjan, Côte d’Ivoire" maxLength={300} {...register("address")} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !isDirty}>
              {save.isPending && <Spinner />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
