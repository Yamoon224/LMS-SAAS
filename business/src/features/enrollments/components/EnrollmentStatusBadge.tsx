import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { ENROLLMENT_STATUS_LABELS } from "@/features/enrollments/schemas/enrollment.schema";
import type { EnrollmentStatus } from "@/features/enrollments/schemas/enrollment.schema";

const STATUS_VARIANTS: Record<EnrollmentStatus, BadgeProps["variant"]> = {
  PENDING_PAYMENT: "secondary",
  PENDING_VALIDATION: "warning",
  ACTIVE: "success",
  COMPLETED: "default",
  EXPIRED: "outline",
  SUSPENDED: "danger",
  REFUSED: "danger",
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{ENROLLMENT_STATUS_LABELS[status]}</Badge>;
}
