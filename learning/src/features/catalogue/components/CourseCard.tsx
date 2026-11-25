import Link from "next/link";

import type { CatalogueCourse } from "../schemas/course.schema";

import { CourseCover } from "./CourseCover";
import { CourseMeta, CoursePrice } from "./CourseMeta";

import { Badge } from "@/components/ui/badge";

/** Carte formation du catalogue : toute la carte est un lien (grande cible tactile). */
export function CourseCard({ course, priority }: { course: CatalogueCourse; priority?: boolean }) {
  return (
    <li>
      <Link
        href={`/courses/${course.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-card shadow-card transition-shadow duration-slow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <CourseCover
          src={course.coverImageUrl}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
        />
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          {course.category && (
            <Badge variant="default" className="self-start">
              {course.category}
            </Badge>
          )}
          <div className="flex-1">
            <h3 className="break-words text-base font-semibold leading-snug group-hover:text-primary">{course.title}</h3>
            {course.subtitle && <p className="mt-1 line-clamp-2 text-sm text-subtle">{course.subtitle}</p>}
          </div>
          <CourseMeta course={course} />
          <CoursePrice course={course} />
        </div>
      </Link>
    </li>
  );
}
