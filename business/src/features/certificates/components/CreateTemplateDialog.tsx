"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { useCreateCertificateTemplate } from "../hooks/useCertificates";
import type { DesignFormValues } from "../schemas/certificate-design-form";
import type { CreateTemplateValues } from "../schemas/certificate.schema";
import { createTemplateSchema, DEFAULT_TEMPLATE_VALUES } from "../schemas/certificate.schema";

import { CertificatePreview } from "./CertificatePreview";
import { DesignFormSections } from "./DesignFormSections";

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
import { ApiError } from "@/lib/api-client";

/** Création d'un modèle de certificat (ENT-38) : sections (mise en page, couleurs, contenu, signatures, éléments) et aperçu en direct. */
export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createTemplate = useCreateCertificateTemplate();

  const form = useForm<CreateTemplateValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: DEFAULT_TEMPLATE_VALUES,
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const values = watch();

  async function onSubmit(submitted: CreateTemplateValues) {
    setSubmitError(null);
    try {
      await createTemplate.mutateAsync(submitted);
      reset(DEFAULT_TEMPLATE_VALUES);
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Création impossible.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouveau modèle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Nouveau modèle de certificat</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate id="template-form">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="template-name">Nom du modèle</Label>
              <Input id="template-name" placeholder="Certificat de réussite" {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>

            <DesignFormSections form={form as unknown as UseFormReturn<DesignFormValues>} />

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register("isDefault")} />
              Utiliser comme modèle par défaut
            </label>

            {submitError && <p className="text-xs text-danger">{submitError}</p>}
          </form>

          <div className="flex flex-col gap-2 lg:sticky lg:top-28 lg:self-start">
            <CertificatePreview values={values} />
            <p className="text-xs text-muted-foreground">Aperçu rapide, approximatif, avec des données fictives. Le PDF réel peut différer légèrement.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" form="template-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
