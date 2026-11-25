import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationsPage } from "@/features/notifications/components/NotificationsPage";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.notifications.title };
}

export default async function Page() {
  const copy = await getCopy();
  return (
    <>
      <PageHeader title={copy.notifications.title} />
      <NotificationsPage />
    </>
  );
}
