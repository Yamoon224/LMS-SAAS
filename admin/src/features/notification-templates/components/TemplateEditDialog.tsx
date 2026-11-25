"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useResetNotificationTemplate, useSaveNotificationTemplate } from "../hooks/useNotificationTemplates";
import { LOCALE_LABELS, templateFormSchema, templateInfo } from "../schemas/notification-template.schema";
import type { NotificationTemplate, TemplateFormValues } from "../schemas/notification-template.schema";

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

interface TemplateEditDialogProps {
  /** Modèle ciblé ; `null` = fermé. */
  template: NotificationTemplate | null;
  onOpenChange: (open: boolean) => void;
}

/** Édition du sujet et du contenu d'un modèle pour une langue, avec rappel des variables disponibles. */
export function TemplateEditDialog({ template, onOpenChange }: TemplateEditDialogProps) {
  const save = useSaveNotificationTemplate();
  const reset = useResetNotificationTemplate();
  const pending = save.isPending || reset.isPending;

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<TemplateFormValues>({ resolver: zodResolver(templateFormSchema), defaultValues: { subject: "", body: "" } });

  useEffect(() => {
    if (template) resetForm({ subject: template.subject, body: template.body });
  }, [template, resetForm]);

  async function onSubmit(values: TemplateFormValues) {
    if (!template) return;
    try {
      await save.mutateAsync({ templateKey: template.templateKey, locale: template.locale, values });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache (le backend nomme la variable fautive)
    }
  }

  async function onResetToDefault() {
    if (!template) return;
    try {
      await reset.mutateAsync({ templateKey: template.templateKey, locale: template.locale });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const label = template ? templateInfo(template.templateKey).label : "";

  return (
    <Dialog open={template !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {label} — {template ? (LOCALE_LABELS[template.locale] ?? template.locale) : ""}
          </DialogTitle>
          <DialogDescription>
            Utilisez <code>{"{{variable}}"}</code> pour insérer une donnée. Le texte est envoyé tel quel, sans mise en
            forme HTML.
          </DialogDescription>
        </DialogHeader>

        {template && (
          <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Variables disponibles">
            {template.variables.map((variable) => (
              <code
                key={variable}
                className="rounded border border-border bg-surface-muted px-1.5 py-0.5"
                title={template.requiredVariables.includes(variable) ? "Obligatoire dans le contenu" : undefined}
              >
                {`{{${variable}}}`}
                {template.requiredVariables.includes(variable) ? " *" : ""}
              </code>
            ))}
            {template.requiredVariables.length > 0 && (
              <span className="text-muted-foreground">* obligatoire dans le contenu</span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="template-subject" label="Sujet" required error={errors.subject?.message}>
            <Input id="template-subject" placeholder="Objet du message" aria-invalid={Boolean(errors.subject)} {...register("subject")} />
          </Field>
          <Field id="template-body" label="Contenu" required error={errors.body?.message}>
            <Textarea id="template-body" rows={9} placeholder="Rédigez le contenu du message…" aria-invalid={Boolean(errors.body)} {...register("body")} />
          </Field>
          <DialogFooter className="sm:justify-between">
            {template?.isCustomized ? (
              <Button type="button" variant="outline" disabled={pending} onClick={() => void onResetToDefault()}>
                Revenir au texte d&apos;origine
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
