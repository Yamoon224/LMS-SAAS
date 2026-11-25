import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AdminUserList } from "@/features/admin-users/components/AdminUserList";

export const metadata: Metadata = {
  title: "Comptes administrateurs",
};

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comptes administrateurs"
        description="Comptes plateforme (Administrateur / Opérateur / Finance / Support)."
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin-users/new">
              <Plus className="h-4 w-4" />
              Inviter un administrateur
            </Link>
          </Button>
        }
      />
      <RequirePermission permission="admin-users.manage">
        <AdminUserList />
      </RequirePermission>
    </div>
  );
}
