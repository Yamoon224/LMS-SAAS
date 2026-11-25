import { PlayerShell } from "@/features/player/components/PlayerShell";

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  return <PlayerShell enrollmentId={enrollmentId}>{children}</PlayerShell>;
}
