import { z } from "zod";

import { optionalInt } from "@/lib/zod-helpers";

/** GET /business/courses/:courseId/modules (ListModulesUseCase) — DTO aplati. */
export const courseModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
});
export type CourseModuleItem = z.infer<typeof courseModuleSchema>;

/** Doit rester cohérent avec CreateModuleDto (course-content/presentation/dto/create-module.dto.ts). */
export const createModuleSchema = z.object({
  title: z.string().min(2, "2 caractères minimum.").max(200),
  description: z.string().optional().or(z.literal("")),
  estimatedDurationMinutes: optionalInt(1),
});
export type CreateModuleValues = z.infer<typeof createModuleSchema>;

/** Doit rester cohérent avec UpdateModuleDto (mêmes champs, tous optionnels). */
export const updateModuleSchema = createModuleSchema.partial();
export type UpdateModuleValues = z.infer<typeof updateModuleSchema>;
