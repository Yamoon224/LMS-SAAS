import type { Metadata } from "next";

import { ResumeRedirect } from "@/features/player/components/ResumeRedirect";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.player.outline };
}

export default async function LearnIndexPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  return <ResumeRedirect enrollmentId={enrollmentId} />;
}
