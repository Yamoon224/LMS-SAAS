"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useCreateLegalDraft, useUpdateLegalDraft } from "../hooks/useLegal";
import { legalDraftFormSchema, LEGAL_TYPE_LABELS } from "../schemas/legal.schema";
import type { LegalDocument, LegalDraftFormValues, LegalType } from "../schemas/legal.schema";

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

/** `create` : nouvelle version d'un type ; `edit` : modification d'un brouillon existant. */
export type LegalDraftTarget = { mode: "create"; type: LegalType; seed?: LegalDocument } | { mode: "edit"; document: LegalDocument };

interface LegalDraftDialogProps {
  target: LegalDraftTarget | null;
  onOpenChange: (open: boolean) => void;
}

function initialValues(target: LegalDraftTarget): LegalDraftFormValues {
  if (target.mode === "edit") return { title: target.document.title, content: target.document.content };
  // Une nouvelle version part du texte de la dernière version : on corrige plutôt qu'on ne réécrit.
  return { title: target.seed?.title ?? LEGAL_TYPE_LABELS[target.type], content: target.seed?.content ?? "" };
}

export function LegalDraftDialog({ target, onOpenChange }: LegalDraftDialogProps) {
  const create = useCreateLegalDraft();
  const update = useUpdateLegalDraft();
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LegalDraftFormValues>({ resolver: zodResolver(legalDraftFormSchema), defaultValues: { title: "", content: "" } });

  useEffect(() => {
    if (target) reset(initialValues(target));
  }, [target, reset]);

  async function onSubmit(values: LegalDraftFormValues) {
    if (!target) return;
    try {
      if (target.mode === "edit") await update.mutateAsync({ id: target.document.id, values });
      else await create.mutateAsync({ type: target.type, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const heading =
    target?.mode === "edit"
      ? `Modifier la version ${target.document.version}`
      : `Nouvelle version — ${target ? LEGAL_TYPE_LABELS[target.type] : ""}`;

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            Le texte est affiché tel quel, paragraphe par paragraphe (séparez-les par une ligne vide). Aucune mise en
            forme HTML n&apos;est interprétée.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="legal-title" label="Titre" required error={errors.title?.message}>
            <Input id="legal-title" placeholder="Conditions générales d’utilisation" aria-invalid={Boolean(errors.title)} {...register("title")} />
          </Field>
          <Field id="legal-content" label="Contenu" required error={errors.content?.message}>
            <Textarea id="legal-content" rows={14} placeholder="Rédigez le texte du document…" aria-invalid={Boolean(errors.content)} {...register("content")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Enregistrer le brouillon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
