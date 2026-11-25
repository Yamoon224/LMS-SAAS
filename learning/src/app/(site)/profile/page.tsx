import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ProfilePage } from "@/features/profile/components/ProfilePage";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.profile.title };
}

export default async function Page() {
  const copy = await getCopy();
  return (
    <>
      <PageHeader title={copy.profile.title} subtitle={copy.profile.subtitle} />
      <ProfilePage />
    </>
  );
}
