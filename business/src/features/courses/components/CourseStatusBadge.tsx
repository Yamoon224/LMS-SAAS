import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { COURSE_STATUS_LABELS } from "@/features/courses/schemas/course.schema";
import type { CourseStatus } from "@/features/courses/schemas/course.schema";

const STATUS_VARIANTS: Record<CourseStatus, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  HIDDEN: "warning",
  ARCHIVED: "outline",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{COURSE_STATUS_LABELS[status]}</Badge>;
}
