"use client";

import type { UseFormReturn } from "react-hook-form";

import type { CreateLessonValues } from "../schemas/lesson.schema";
import { DEFAULT_WATCHED_PERCENT, isOpenable, isWatchable, RESOURCE_TYPE_LABELS } from "../schemas/lesson.schema";
import { acceptsUploadedFile } from "../schemas/media.schema";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/features/rich-text/components/RichTextEditor";

type Form = UseFormReturn<CreateLessonValues>;

function SwitchRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border p-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** ENT-25 : « contenu obligatoire » et seuil de visionnage (défaut 90 %) ou simple ouverture. */
function CriteriaFields({ form }: { form: Form }) {
  const { register, watch, setValue, formState } = form;
  const resourceType = watch("resourceType");
  const isMandatory = watch("isMandatory");
  const requiresOpen = watch("completionCriteria.requiresOpen") ?? true;
  const percentError = formState.errors.completionCriteria?.watchedPercent;

  return (
    <>
      <SwitchRow
        id="lesson-mandatory"
        label="Contenu obligatoire"
        hint="Doit être consulté selon son critère propre pour progresser."
        checked={isMandatory}
        onChange={(checked) => setValue("isMandatory", checked)}
      />
      {isMandatory && isWatchable(resourceType) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lesson-watched-percent">Pourcentage à regarder au minimum (%)</Label>
          <Input
            id="lesson-watched-percent"
            type="number"
            min={1}
            max={100}
            placeholder={String(DEFAULT_WATCHED_PERCENT)}
            aria-invalid={Boolean(percentError)}
            {...register("completionCriteria.watchedPercent")}
          />
          <p className="text-xs text-muted-foreground">Entre 1 et 100. Par défaut {DEFAULT_WATCHED_PERCENT} %.</p>
          {percentError && <p className="text-xs text-danger">Entrez un entier entre 1 et 100.</p>}
        </div>
      )}
      {isMandatory && isOpenable(resourceType) && (
        <SwitchRow
          id="lesson-requires-open"
          label="Simple ouverture suffit"
          checked={requiresOpen}
          onChange={(checked) => setValue("completionCriteria.requiresOpen", checked)}
        />
      )}
    </>
  );
}

/** Contenu propre au type : éditeur riche (texte), URL https (lien) ; les fichiers se gèrent dans le panneau média. */
function ContentField({ form }: { form: Form }) {
  const { register, watch, setValue, formState } = form;
  const resourceType = watch("resourceType");

  if (resourceType === "TEXT") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lesson-content">Contenu</Label>
        <RichTextEditor
          id="lesson-content"
          label="Contenu de la leçon"
          value={watch("contentHtml") ?? ""}
          onChange={(html) => setValue("contentHtml", html, { shouldDirty: true })}
        />
      </div>
    );
  }
  if (resourceType === "LINK") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lesson-storage-url">Adresse du lien (https)</Label>
        <Input id="lesson-storage-url" type="url" placeholder="https://…" {...register("storageUrl")} />
        {formState.errors.storageUrl && <p className="text-xs text-danger">{formState.errors.storageUrl.message}</p>}
      </div>
    );
  }
  return null;
}

interface LessonFormFieldsProps {
  form: Form;
  /** Le type est immuable après création : sélecteur masqué en édition. */
  lockType?: boolean;
}

/** Champs communs aux dialogues de création et de modification d'une leçon (ENT-23 à ENT-25). */
export function LessonFormFields({ form, lockType }: LessonFormFieldsProps) {
  const { register, watch, setValue, formState } = form;
  const resourceType = watch("resourceType");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lesson-title">Titre</Label>
        <Input id="lesson-title" placeholder="Leçon 1 — Présentation" {...register("title")} />
        {formState.errors.title && <p className="text-xs text-danger">{formState.errors.title.message}</p>}
      </div>

      {!lockType && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lesson-type">Type de contenu</Label>
          <Select value={resourceType} onValueChange={(value) => setValue("resourceType", value as CreateLessonValues["resourceType"])}>
            <SelectTrigger id="lesson-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ContentField form={form} />
      <CriteriaFields form={form} />

      {acceptsUploadedFile(resourceType) && (
        <SwitchRow
          id="lesson-download"
          label="Téléchargement autorisé"
          hint="Les apprenants pourront télécharger le fichier."
          checked={watch("downloadAllowed")}
          onChange={(checked) => setValue("downloadAllowed", checked)}
        />
      )}
    </>
  );
}
