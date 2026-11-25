import type { BusinessUser } from "../schemas/user.schema";

import { Badge } from "@/components/ui/badge";

/** Rôles d'un utilisateur sous forme de pastilles (noms résolus via la liste des rôles du tenant). */
export function RoleBadges({ user, roleNames }: { user: BusinessUser; roleNames: Map<string, string> }) {
  if (user.roleIds.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {user.roleIds.map((roleId) => (
        <Badge key={roleId} variant="outline">
          {roleNames.get(roleId) ?? "Rôle"}
        </Badge>
      ))}
    </div>
  );
}
