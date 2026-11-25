"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { useSaveLibraryTemplate } from "../hooks/useCertificateLibrary";
import { usePdfPreview } from "../hooks/usePdfPreview";
import type { DesignFormValues } from "../schemas/certificate-design-form";
import { libraryFormSchema, toDesign, toFormValues } from "../schemas/certificate-library.schema";
import type { LibraryFormValues, LibraryTemplate } from "../schemas/certificate-library.schema";

import { CertificatePreview } from "./CertificatePreview";
import { DesignFormSections } from "./DesignFormSections";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

/** `null` = fermé ; `{ template: undefined }` = création ; sinon modification. */
export type LibraryDialogTarget = { template?: LibraryTemplate } | null;

/** Création et modification d'un modèle de la bibliothèque, avec aperçu PDF avant enregistrement. */
export function LibraryTemplateDialog({
  target,
  onOpenChange,
}: {
  target: LibraryDialogTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveLibraryTemplate();
  const preview = usePdfPreview();
  const form = useForm<LibraryFormValues>({ resolver: zodResolver(libraryFormSchema), defaultValues: toFormValues() });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (target) {
      reset(toFormValues(target.template));
      preview.reset();
    }
    // `preview.reset` est stable (useCallback) : on ne réinitialise qu'à l'ouverture d'un autre modèle.
  }, [target, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPreview() {
    // Le formulaire complet n'est pas obligatoire pour un aperçu, mais les réglages de rendu doivent être valides.
    const valid = await trigger();
    if (valid) await preview.load(toDesign(getValues()));
  }

  async function onSubmit(values: LibraryFormValues) {
    try {
      await save.mutateAsync({ id: target?.template?.id, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache (nom déjà pris, design invalide…)
    }
  }

  const values = watch();

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{target?.template ? `Modifier « ${target.template.name} »` : "Nouveau modèle"}</DialogTitle>
          <DialogDescription>
            Mise en page, couleurs, contenu, signatures et éléments affichés. Un modèle reste invisible des entreprises tant qu&apos;il n&apos;est
            pas publié. Modifier un modèle ne change jamais les certificats déjà émis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate id="library-form">
            <Field id="name" label="Nom" required error={errors.name?.message}>
              <Input id="name" placeholder="Certificat de réussite" aria-invalid={Boolean(errors.name)} {...register("name")} />
            </Field>
            <Field id="description" label="Description" error={errors.description?.message}>
              <Textarea id="description" rows={2} placeholder="Modèle sobre pour les formations professionnelles" {...register("description")} />
            </Field>
            <DesignFormSections form={form as unknown as UseFormReturn<DesignFormValues>} />
          </form>

          <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
            <CertificatePreview values={values} />
            <p className="text-xs text-muted-foreground">Aperçu rapide, approximatif. Le PDF réel peut différer légèrement.</p>
            <Button type="button" variant="outline" disabled={preview.loading} onClick={() => void onPreview()}>
              {preview.loading && <Spinner />}
              Prévisualiser le PDF réel
            </Button>
            {preview.error && (
              <p role="alert" className="text-sm text-danger">
                {preview.error}
              </p>
            )}
            {preview.url ? (
              <iframe
                title="Aperçu du certificat"
                src={preview.url}
                className="h-[26rem] w-full rounded border border-border bg-surface-muted"
              />
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="library-form" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
