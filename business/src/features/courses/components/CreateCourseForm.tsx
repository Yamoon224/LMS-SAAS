"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useCreateCourse } from "../hooks/useCreateCourse";
import type { CreateCourseValues } from "../schemas/course.schema";
import { createCourseSchema } from "../schemas/course.schema";

import { CourseGeneralFields } from "./CourseGeneralFields";
import { CourseInstructorsField } from "./CourseInstructorsField";
import { CoursePricingFields } from "./CoursePricingFields";

import { Button } from "@/components/ui/button";
import { StickyFormBar } from "@/components/ui/form-bar";
import { Spinner } from "@/components/ui/spinner";

/** Formulaire de création (ENT-15). Formateurs choisis parmi les utilisateurs du tenant (ENT-10). */
export function CreateCourseForm() {
  const router = useRouter();
  const createCourse = useCreateCourse();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      type: "NON_CERTIFYING",
      progressionMode: "SEQUENTIAL",
      sourceLocale: "fr",
      price: 0,
      currency: "XOF",
      category: "",
      level: "",
      coverImageUrl: "",
      instructorIds: [],
    },
  });

  const type = watch("type");
  const progressionMode = watch("progressionMode");
  const instructorIds = watch("instructorIds");

  async function onSubmit(values: CreateCourseValues) {
    const result = await createCourse.mutateAsync(values);
    router.push(`/courses/${result.id}`);
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:gap-6" noValidate>
      <CourseGeneralFields
        register={register}
        errors={errors}
        type={type}
        progressionMode={progressionMode}
        onTypeChange={(value) => setValue("type", value)}
        onProgressionModeChange={(value) => setValue("progressionMode", value)}
      />

      <CoursePricingFields
        register={register}
        errors={errors}
        currency={watch("currency")}
        onCurrencyChange={(value) => setValue("currency", value)}
      />

      <CourseInstructorsField
        error={errors.instructorIds?.message}
        value={instructorIds ?? []}
        onChange={(ids) => setValue("instructorIds", ids, { shouldValidate: true, shouldDirty: true })}
      />

      <StickyFormBar>
        <Button type="button" variant="outline" onClick={() => router.push("/courses")}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Créer la formation
        </Button>
      </StickyFormBar>
    </form>
  );
}
