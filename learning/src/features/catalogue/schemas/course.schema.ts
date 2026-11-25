import { z } from "zod";

/** Carte catalogue : un élément de GET /public/courses (formations publiées du tenant). */
export const catalogueCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullish(),
  price: z.number(),
  compareAtPrice: z.number().nullish(),
  currency: z.string(),
  type: z.enum(["CERTIFYING", "NON_CERTIFYING"]).nullish(),
  category: z.string().nullish(),
  level: z.string().nullish(),
  estimatedDurationMinutes: z.number().nullish(),
  coverImageUrl: z.string().nullish(),
  /** Langue d'origine et langues lisibles (origine + traductions publiées). */
  language: z.string().nullish(),
  languages: z.array(z.string()),
  publishedAt: z.string().nullish(),
});
export type CatalogueCourse = z.infer<typeof catalogueCourseSchema>;

const facetSchema = z.object({ value: z.string(), count: z.number() });
export type Facet = z.infer<typeof facetSchema>;

/** GET /public/courses : page de résultats + valeurs proposées aux filtres. */
export const cataloguePageSchema = z.object({
  items: z.array(catalogueCourseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  facets: z.object({
    categories: z.array(facetSchema),
    languages: z.array(facetSchema),
    levels: z.array(facetSchema),
  }),
});
export type CataloguePage = z.infer<typeof cataloguePageSchema>;

/** Fiche formation : GET /public/courses/:id (liste blanche : titres du programme seulement, jamais de contenu). */
export const courseDetailSchema = catalogueCourseSchema.extend({
  description: z.string().nullish(),
  type: z.enum(["CERTIFYING", "NON_CERTIFYING"]),
  accessDurationDays: z.number().nullish(),
  progressionMode: z.enum(["SEQUENTIAL", "FREE"]).nullish(),
  certifying: z.boolean(),
  instructors: z.array(z.object({ name: z.string() })),
  syllabus: z
    .array(
      z.object({
        title: z.string(),
        lessons: z.array(z.object({ title: z.string(), resourceType: z.string() })),
      }),
    )
    ,
  modulesCount: z.number(),
  lessonsCount: z.number(),
  upcomingSessions: z
    .array(z.object({ title: z.string(), startAt: z.string(), durationMinutes: z.number() }))
    ,
});
export type CourseDetail = z.infer<typeof courseDetailSchema>;
