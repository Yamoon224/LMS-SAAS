import type { Role } from "../schemas/user.schema";

import { Checkbox } from "@/components/ui/checkbox";


interface RoleCheckboxesProps {
  roles: Role[];
  value: string[];
  onChange: (roleIds: string[]) => void;
  idPrefix: string;
}

/** Cases à cocher de rôles (≥ 44px de hauteur tactile), partagées par l'invitation et l'attribution. */
export function RoleCheckboxes({ roles, value, onChange, idPrefix }: RoleCheckboxesProps) {
  function toggle(roleId: string, checked: boolean) {
    onChange(checked ? [...value, roleId] : value.filter((id) => id !== roleId));
  }

  return (
    <div className="flex flex-col gap-1" role="group" aria-label="Rôles">
      {roles.map((role) => {
        const id = `${idPrefix}-${role.id}`;
        return (
          <label
            key={role.id}
            htmlFor={id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm transition-colors hover:bg-accent has-[:checked]:border-brand/40 has-[:checked]:bg-brand/5 sm:min-h-10"
          >
            <Checkbox
              id={id}
              checked={value.includes(role.id)}
              onChange={(event) => toggle(role.id, event.target.checked)}
            />
            {role.name}
          </label>
        );
      })}
    </div>
  );
}
