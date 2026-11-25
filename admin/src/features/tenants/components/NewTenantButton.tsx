"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/session/hooks/useSession";

/** Bouton « Nouvelle entreprise », visible seulement avec la permission tenants.create. */
export function NewTenantButton() {
  const { can } = usePermissions();
  if (!can("tenants.create")) return null;
  return (
    <Button asChild className="w-full sm:w-auto">
      <Link href="/tenants/new">
        <Plus className="h-4 w-4" />
        Nouvelle entreprise
      </Link>
    </Button>
  );
}
