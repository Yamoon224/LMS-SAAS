"use client";

import { BarChart3, Clock } from "lucide-react";

import type { CatalogueCourse } from "../schemas/course.schema";

import { formatDuration, formatPrice } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";

/** Niveau + durée sur une ligne compacte. */
export function CourseMeta({ course }: { course: Pick<CatalogueCourse, "level" | "estimatedDurationMinutes"> }) {
  const copy = useCopy();
  const duration = formatDuration(course.estimatedDurationMinutes, copy.format);
  const level = course.level ? (copy.levels[course.level] ?? course.level) : null;
  if (!duration && !level) return null;

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
      {level && (
        <li className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          {level}
        </li>
      )}
      {duration && (
        <li className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {duration}
        </li>
      )}
    </ul>
  );
}

/** Prix (et ancien prix barré s'il y a une remise). */
export function CoursePrice({
  course,
  large,
}: {
  course: Pick<CatalogueCourse, "price" | "compareAtPrice" | "currency">;
  large?: boolean;
}) {
  const copy = useCopy();
  const locale = useLocale();
  const hasDiscount = course.compareAtPrice != null && course.compareAtPrice > course.price;
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className={large ? "text-3xl font-bold" : "text-base font-bold"}>
        {formatPrice(course.price, course.currency, locale, copy.format)}
      </span>
      {hasDiscount && (
        <span className="text-sm text-subtle line-through">
          <span className="sr-only">{copy.course.oldPrice} : </span>
          {formatPrice(course.compareAtPrice as number, course.currency, locale, copy.format)}
        </span>
      )}
    </p>
  );
}
