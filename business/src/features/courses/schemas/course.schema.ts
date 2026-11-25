import { z } from "zod";

import { optionalInt } from "@/lib/zod-helpers";

/** Doit rester cohérent avec CourseType (backend/.../courses/domain/course-type.ts). ENT-17. */
export const courseTypeSchema = z.enum(["CERTIFYING", "NON_CERTIFYING"]);
export type CourseType = z.infer<typeof courseTypeSchema>;

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  CERTIFYING: "Certifiante",
  NON_CERTIFYING: "Non certifiante",
};

/** Doit rester cohérent avec ProgressionMode. ENT-19. */
export const progressionModeSchema = z.enum(["SEQUENTIAL", "FREE"]);
export type ProgressionMode = z.infer<typeof progressionModeSchema>;

export const PROGRESSION_MODE_LABELS: Record<ProgressionMode, string> = {
  SEQUENTIAL: "Séquentiel (déverrouillage dans l'ordre)",
  FREE: "Libre",
};

/** Doit rester cohérent avec CourseStatus (section 8.1). */
export const courseStatusSchema = z.enum(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]);
export type CourseStatus = z.infer<typeof courseStatusSchema>;

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  HIDDEN: "Masquée",
  ARCHIVED: "Archivée",
};

/**
 * Transitions autorisées (ENT-18, voir course-status.ts côté backend) :
 * Brouillon → Publiée | Archivée ; Publiée → Masquée | Archivée ;
 * Masquée → Publiée | Archivée ; Archivée → (aucune, état terminal).
 * Dupliquée côté front pour piloter l'affichage des actions disponibles —
 * le backend reste la source de vérité et rejette toute transition invalide.
 */
export const ALLOWED_COURSE_STATUS_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["HIDDEN", "ARCHIVED"],
  HIDDEN: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

/** Item de liste : GET /business/courses renvoie un DTO aplati minimal. */
export const courseListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: courseStatusSchema,
  price: z.number(),
});
export type CourseListItem = z.infer<typeof courseListItemSchema>;

/**
 * Fiche formation : GET /business/courses/:id renvoie désormais un DTO
 * aplati via `toCourseResponse()` dans BusinessCoursesController.findOne
 * (corrigé pendant cette passe — même forme que les autres routes du
 * contrôleur, qui mappaient déjà manuellement vers un objet simple).
 */
export const courseDetailSchema = z.object({
  id: z.string(),
  tenantId: z.string().optional(),
  title: z.string(),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  type: courseTypeSchema,
  status: courseStatusSchema,
  progressionMode: progressionModeSchema,
  sourceLocale: z.string(),
  price: z.number(),
  compareAtPrice: z.number().nullish(),
  currency: z.string(),
  accessDurationDays: z.number().nullish(),
  category: z.string().nullish(),
  level: z.string().nullish(),
  estimatedDurationMinutes: z.number().nullish(),
  coverImageUrl: z.string().nullish(),
  instructorIds: z.array(z.string()).default([]),
  publishedAt: z.coerce.date().nullish(),
  certificateTemplateId: z.string().nullish(),
});

export type CourseDetail = z.infer<typeof courseDetailSchema>;

/** Doit rester cohérent avec CreateCourseDto (backend/.../courses/presentation/dto/create-course.dto.ts). */
export const createCourseSchema = z.object({
  title: z.string().min(2, "2 caractères minimum.").max(200),
  subtitle: z.string().max(300).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  type: courseTypeSchema,
  progressionMode: progressionModeSchema,
  sourceLocale: z.string().min(2).max(5),
  price: z.coerce.number().int().min(0, "Montant positif requis (0 = gratuit)."),
  compareAtPrice: optionalInt(0),
  currency: z.string().length(3, "Code devise ISO sur 3 lettres (ex. XOF)."),
  accessDurationDays: optionalInt(1),
  category: z.string().max(100).optional().or(z.literal("")),
  level: z.string().max(100).optional().or(z.literal("")),
  estimatedDurationMinutes: optionalInt(1),
  coverImageUrl: z.string().url("URL invalide.").optional().or(z.literal("")),
  instructorIds: z.array(z.string()).min(1, "Au moins un formateur requis."),
});
export type CreateCourseValues = z.infer<typeof createCourseSchema>;

/**
 * Doit rester cohérent avec UpdateCourseDto (backend/.../courses/presentation/dto/update-course.dto.ts),
 * qui pick() une liste de champs explicite depuis CreateCourseDto — `type`, `sourceLocale` ET `currency`
 * en sont exclus (immuables après création), contrairement à une simple omission de `type`/`sourceLocale`.
 */
export const updateCourseSchema = createCourseSchema
  .omit({ type: true, sourceLocale: true, currency: true })
  .partial();
export type UpdateCourseValues = z.infer<typeof updateCourseSchema>;
