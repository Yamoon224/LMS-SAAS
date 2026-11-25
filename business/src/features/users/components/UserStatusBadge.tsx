import { USER_STATUS_LABELS } from "../schemas/user.schema";
import type { UserStatus } from "../schemas/user.schema";

import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const VARIANTS: Record<UserStatus, BadgeProps["variant"]> = {
  INVITED: "info",
  ACTIVE: "success",
  SUSPENDED: "warning",
  DEACTIVATED: "secondary",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={VARIANTS[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}
