import type { Metadata } from "next";

import { CreateCourseForm } from "@/features/courses/components/CreateCourseForm";

export const metadata: Metadata = {
  title: "Nouvelle formation",
};

export default function NewCoursePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nouvelle formation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créée en Brouillon — le programme (modules et leçons) se construit ensuite depuis la
          fiche formation.
        </p>
      </div>

      <CreateCourseForm />
    </div>
  );
}
