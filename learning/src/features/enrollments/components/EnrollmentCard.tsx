"use client";

import Link from "next/link";

import { useCourse, useModulesAccess } from "../hooks/useEnrollments";
import { isAccessGranting } from "../schemas/enrollment.schema";
import type { Enrollment } from "../schemas/enrollment.schema";

import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCover } from "@/features/catalogue/components/CourseCover";
import { useCopy } from "@/lib/i18n/client";

function ModulesProgress({ enrollment }: { enrollment: Enrollment }) {
  const copy = useCopy();
  const modules = useModulesAccess(enrollment.id, enrollment.courseId, true);
  const total = modules.data?.length ?? 0;
  if (total === 0) return null;

  const validated = modules.data?.filter((m) => m.validated).length ?? 0;
  const label = copy.learning.modulesProgress(validated, total);
  return (
    <div className="flex flex-col gap-2">
      <Progress value={(validated / total) * 100} label={label} />
      <p className="text-xs text-subtle">{label}</p>
    </div>
  );
}

/** Carte "Mon apprentissage" : titre, statut, progression par modules, CTA. */
export function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const copy = useCopy();
  // Le backend renvoie désormais titre et couverture : plus d'appel par carte (repli si absents).
  const course = useCourse(enrollment.courseTitle ? "" : enrollment.courseId);
  const granted = isAccessGranting(enrollment.status);
  const title = enrollment.courseTitle ?? course.data?.title ?? (course.isError ? copy.learning.courseUnavailable : null);

  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-line bg-card shadow-card sm:flex-row">
      <CourseCover
        src={enrollment.courseCoverImageUrl ?? course.data?.coverImageUrl}
        alt=""
        sizes="(min-width: 640px) 240px, 100vw"
        className="sm:aspect-auto sm:w-60 sm:shrink-0"
      />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <EnrollmentStatusBadge status={enrollment.status} />
        </div>
        {title ? <h2 className="text-base font-semibold leading-snug sm:text-lg">{title}</h2> : <Skeleton className="h-6 w-2/3" />}

        {granted ? (
          <ModulesProgress enrollment={enrollment} />
        ) : (
          <p className="text-sm text-subtle">{copy.statusHelp[enrollment.status]}</p>
        )}

        <div className="mt-auto pt-1">
          <Button asChild size="sm" variant={granted ? "default" : "outline"}>
            <Link href={`/my-learning/${enrollment.id}`}>{granted ? copy.learning.resume : copy.learning.open}</Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
