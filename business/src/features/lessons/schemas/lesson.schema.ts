import { z } from "zod";

import { mediaViewSchema } from "./media.schema";

import { normalizeHttpsUrl } from "@/features/rich-text/lib/url";
import { optionalInt } from "@/lib/zod-helpers";

/** Doit rester cohérent avec ResourceType (course-content/domain/resource-type.ts). ENT-23/ENT-24. */
export const resourceTypeSchema = z.enum([
  "TEXT",
  "PDF",
  "AUDIO",
  "VIDEO",
  "IMAGE",
  "DOCUMENT",
  "LINK",
]);
export type ResourceType = z.infer<typeof resourceTypeSchema>;

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  TEXT: "Texte",
  PDF: "PDF",
  AUDIO: "Audio",
  VIDEO: "Vidéo",
  IMAGE: "Image",
  DOCUMENT: "Document",
  LINK: "Lien",
};

/** Doit rester cohérent avec CompletionCriteriaDto. ENT-25. */
export const completionCriteriaSchema = z.object({
  watchedPercent: optionalInt(1, 100),
  requiresOpen: z.boolean().optional(),
});
export type CompletionCriteriaValues = z.infer<typeof completionCriteriaSchema>;

/** GET /business/modules/:moduleId/lessons (ListLessonsUseCase) — DTO aplati. */
export const lessonListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  resourceType: resourceTypeSchema,
  isMandatory: z.boolean(),
});
export type LessonListItem = z.infer<typeof lessonListItemSchema>;

/** Doit rester cohérent avec CreateLessonDto (course-content/presentation/dto/create-lesson.dto.ts). */
export const createLessonSchema = z.object({
  title: z.string().min(2, "2 caractères minimum.").max(200),
  resourceType: resourceTypeSchema,
  contentHtml: z.string().optional().or(z.literal("")),
  storageUrl: z.string().optional().or(z.literal("")),
  isMandatory: z.boolean(),
  completionCriteria: completionCriteriaSchema.optional(),
  downloadAllowed: z.boolean(),
});
export type CreateLessonValues = z.infer<typeof createLessonSchema>;

/** Doit rester cohérent avec UpdateLessonDto (resourceType immuable après création). */
export const updateLessonSchema = createLessonSchema.omit({ resourceType: true }).partial();
export type UpdateLessonValues = z.infer<typeof updateLessonSchema>;

/** ENT-25 : seuil de visionnage par défaut (« regarder au moins 90 % »). */
export const DEFAULT_WATCHED_PERCENT = 90;

export function isWatchable(resourceType: ResourceType): boolean {
  return resourceType === "VIDEO" || resourceType === "AUDIO";
}

export function isOpenable(resourceType: ResourceType): boolean {
  return resourceType === "PDF" || resourceType === "DOCUMENT";
}

/**
 * ENT-25 : critère de consultation à envoyer. Pour un contenu obligatoire vidéo/audio : seuil en % (défaut 90, borné 1-100) ;
 * pour PDF/document : simple ouverture. Contenu non obligatoire ou autre type : aucun critère envoyé (`undefined`).
 */
export function buildCompletionCriteria(
  resourceType: ResourceType,
  isMandatory: boolean,
  raw: { watchedPercent?: number | string | null; requiresOpen?: boolean } | undefined,
): CompletionCriteriaValues | undefined {
  if (!isMandatory) return undefined;
  if (isWatchable(resourceType)) {
    const parsed = Number(raw?.watchedPercent);
    const percent = Number.isFinite(parsed) && raw?.watchedPercent !== "" && raw?.watchedPercent != null ? Math.round(parsed) : DEFAULT_WATCHED_PERCENT;
    return { watchedPercent: Math.min(100, Math.max(1, percent)) };
  }
  if (isOpenable(resourceType)) return { requiresOpen: raw?.requiresOpen ?? true };
  return undefined;
}

/** GET /business/modules/:moduleId/lessons/:lessonId : fiche pour l'édition. */
export const lessonDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  resourceType: resourceTypeSchema,
  contentHtml: z.string().nullish(),
  isMandatory: z.boolean(),
  completionCriteria: z
    .object({ watchedPercent: z.number().optional(), requiresOpen: z.boolean().optional() })
    .nullish(),
  downloadAllowed: z.boolean(),
  mediaAssetId: z.string().nullish(),
  externalUrl: z.string().nullish(),
  media: mediaViewSchema.nullish(),
});
export type LessonDetail = z.infer<typeof lessonDetailSchema>;

/** Schéma du formulaire (création et édition) : un lien doit être une URL https. */
export const lessonFormSchema = createLessonSchema.superRefine((values, ctx) => {
  if (values.resourceType === "LINK" && !normalizeHttpsUrl(values.storageUrl ?? "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["storageUrl"], message: "Saisissez une adresse https valide." });
  }
});

/** Charge utile de création : seuls les champs propres au type sont envoyés (le fichier se rattache ensuite). */
export function toCreatePayload(values: CreateLessonValues): CreateLessonValues {
  return {
    title: values.title.trim(),
    resourceType: values.resourceType,
    contentHtml: values.resourceType === "TEXT" ? values.contentHtml || undefined : undefined,
    storageUrl: values.resourceType === "LINK" ? normalizeHttpsUrl(values.storageUrl ?? "") ?? undefined : undefined,
    isMandatory: values.isMandatory,
    completionCriteria: buildCompletionCriteria(values.resourceType, values.isMandatory, values.completionCriteria),
    downloadAllowed: values.downloadAllowed,
  };
}

/** Charge utile de modification : ne touche jamais au fichier téléversé (géré par le panneau média). */
export function toUpdatePayload(values: CreateLessonValues): UpdateLessonValues {
  const { resourceType: _type, ...rest } = toCreatePayload(values);
  return { ...rest, contentHtml: values.resourceType === "TEXT" ? (values.contentHtml ?? "") : undefined };
}

/** Valeurs initiales du formulaire d'édition à partir de la fiche de leçon (reflète le critère existant). */
export function lessonToFormValues(lesson: LessonDetail): CreateLessonValues {
  return {
    title: lesson.title,
    resourceType: lesson.resourceType,
    contentHtml: lesson.contentHtml ?? "",
    storageUrl: lesson.externalUrl ?? "",
    isMandatory: lesson.isMandatory,
    completionCriteria: {
      watchedPercent: lesson.completionCriteria?.watchedPercent ?? DEFAULT_WATCHED_PERCENT,
      requiresOpen: lesson.completionCriteria?.requiresOpen ?? true,
    },
    downloadAllowed: lesson.downloadAllowed,
  };
}
