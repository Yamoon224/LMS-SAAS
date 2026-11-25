import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/features/admin-users/schemas/admin-user.schema";
import { USER_STATUS_LABELS } from "@/features/admin-users/schemas/admin-user.schema";

const VARIANT_BY_STATUS: Record<UserStatus, "success" | "warning" | "danger" | "secondary"> = {
  INVITED: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  DEACTIVATED: "secondary",
};

export function AdminUserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}
