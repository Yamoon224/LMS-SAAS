import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformRoles } from "@/features/admin-users/hooks/usePlatformRoles";

interface RoleCheckboxListProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
}

/** Sélection multiple des rôles plateforme (invitation / affectation, ADM-36). */
export function RoleCheckboxList({ selectedRoleIds, onChange }: RoleCheckboxListProps) {
  const { data: roles, isLoading, isError, error, refetch } = usePlatformRoles();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorBanner title="Impossible de charger les rôles." error={error} onRetry={() => void refetch()} />;
  }

  if (!roles || roles.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun rôle plateforme disponible.</p>;
  }

  function toggle(roleId: string, checked: boolean) {
    onChange(checked ? [...selectedRoleIds, roleId] : selectedRoleIds.filter((id) => id !== roleId));
  }

  return (
    <div role="group" aria-label="Rôles plateforme" className="flex flex-col rounded-lg border border-border">
      {roles.map((role) => (
        <label
          key={role.id}
          className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-3 text-sm last:border-b-0 hover:bg-accent/50"
        >
          <Checkbox
            checked={selectedRoleIds.includes(role.id)}
            onChange={(event) => toggle(role.id, event.target.checked)}
          />
          {role.name}
        </label>
      ))}
    </div>
  );
}
