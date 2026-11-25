"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourses } from "@/features/courses/hooks/useCourses";

interface CourseSelectProps {
  value: string;
  onChange: (courseId: string) => void;
  className?: string;
  id?: string;
}

/** Sélecteur de formation du tenant (liste ENT-15), partagé par les sections qui travaillent par formation. */
export function CourseSelect({ value, onChange, className, id }: CourseSelectProps) {
  const { data: courses, isLoading, isError } = useCourses();

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading || isError}>
      <SelectTrigger id={id} className={className} aria-label="Formation">
        <SelectValue placeholder={isLoading ? "Chargement…" : isError ? "Erreur de chargement" : "Choisir une formation"} />
      </SelectTrigger>
      <SelectContent>
        {(courses ?? []).map((course) => (
          <SelectItem key={course.id} value={course.id}>
            {course.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
