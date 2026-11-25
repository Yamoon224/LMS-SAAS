import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { InviteAdminUserForm } from "@/features/admin-users/components/InviteAdminUserForm";

export const metadata: Metadata = {
  title: "Inviter un administrateur",
};

export default function NewAdminUserPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Inviter un administrateur plateforme"
        description="Le compte reçoit un lien d’activation par e-mail pour définir son mot de passe."
      />
      <RequirePermission permission="admin-users.manage">
        <InviteAdminUserForm />
      </RequirePermission>
    </div>
  );
}
