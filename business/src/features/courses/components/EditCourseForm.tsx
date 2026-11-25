"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useUpdateCourse } from "../hooks/useUpdateCourse";
import type { CourseDetail, UpdateCourseValues } from "../schemas/course.schema";
import { updateCourseSchema } from "../schemas/course.schema";

import { CourseGeneralFields } from "./CourseGeneralFields";
import { CourseInstructorsField } from "./CourseInstructorsField";
import { CoursePricingFields } from "./CoursePricingFields";

import { Button } from "@/components/ui/button";
import { StickyFormBar } from "@/components/ui/form-bar";
import { Spinner } from "@/components/ui/spinner";

/**
 * Formulaire d'édition (ENT-15/ENT-21). Réutilise les mêmes sous-composants
 * de champs que le formulaire de création, rendus génériques sur
 * CreateCourseValues | UpdateCourseValues. `type`, `sourceLocale` et `currency`
 * ne sont pas éditables (UpdateCourseDto ne les accepte pas — immuables après
 * création, cf. course.schema.ts) : affichés en lecture seule via
 * CourseGeneralFields/CoursePricingFields, jamais soumis.
 */
export function EditCourseForm({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const updateCourse = useUpdateCourse(course.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCourseValues>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      title: course.title,
      subtitle: course.subtitle ?? "",
      description: course.description ?? "",
      progressionMode: course.progressionMode,
      price: course.price,
      compareAtPrice: course.compareAtPrice ?? undefined,
      accessDurationDays: course.accessDurationDays ?? undefined,
      category: course.category ?? "",
      level: course.level ?? "",
      estimatedDurationMinutes: course.estimatedDurationMinutes ?? undefined,
      coverImageUrl: course.coverImageUrl ?? "",
      instructorIds: course.instructorIds,
    },
  });

  const progressionMode = watch("progressionMode");
  const instructorIds = watch("instructorIds");

  async function onSubmit(values: UpdateCourseValues) {
    await updateCourse.mutateAsync(values);
    router.push(`/courses/${course.id}`);
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:gap-6" noValidate>
      <CourseGeneralFields
        register={register}
        errors={errors}
        progressionMode={progressionMode ?? course.progressionMode}
        onProgressionModeChange={(value) => setValue("progressionMode", value)}
        sourceLocale={course.sourceLocale}
      />

      <CoursePricingFields register={register} errors={errors} currency={course.currency} />

      <CourseInstructorsField
        error={errors.instructorIds?.message}
        value={instructorIds ?? []}
        onChange={(ids) => setValue("instructorIds", ids, { shouldValidate: true, shouldDirty: true })}
      />

      <StickyFormBar>
        <Button type="button" variant="outline" onClick={() => router.push(`/courses/${course.id}`)}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Enregistrer
        </Button>
      </StickyFormBar>
    </form>
  );
}
