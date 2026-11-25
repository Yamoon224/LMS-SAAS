import type { Metadata } from "next";

import { LessonView } from "@/features/player/components/LessonView";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.player.outline };
}

export default async function LessonPage({ params }: { params: Promise<{ enrollmentId: string; lessonId: string }> }) {
  const { enrollmentId, lessonId } = await params;
  return <LessonView key={lessonId} enrollmentId={enrollmentId} lessonId={lessonId} />;
}
