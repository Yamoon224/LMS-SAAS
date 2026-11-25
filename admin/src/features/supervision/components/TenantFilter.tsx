"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenants } from "@/features/tenants/hooks/useTenants";

const ALL = "all";

interface TenantFilterProps {
  /** `undefined` = toutes les entreprises. */
  value: string | undefined;
  onChange: (tenantId: string | undefined) => void;
}

/** Filtre « entreprise » commun aux listes de supervision (ADM-29 à ADM-32). */
export function TenantFilter({ value, onChange }: TenantFilterProps) {
  const { data: tenants } = useTenants();

  return (
    <div className="w-full max-w-xs">
      <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? undefined : next)}>
        <SelectTrigger aria-label="Filtrer par entreprise">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes les entreprises</SelectItem>
          {tenants?.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
