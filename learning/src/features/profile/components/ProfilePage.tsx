"use client";

import { useProfile } from "../hooks/useProfile";

import { MyDataSection } from "./MyDataSection";
import { ProfileForm } from "./ProfileForm";

import { ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/lib/i18n/client";

export function ProfilePage() {
  const copy = useCopy();
  const profile = useProfile();

  if (profile.isLoading) return <Skeleton className="h-64 max-w-xl" />;
  if (profile.isError || !profile.data) {
    return <ErrorState title={copy.profile.loadFailed} onRetry={() => void profile.refetch()} />;
  }
  return (
    <>
      <ProfileForm profile={profile.data} />
      <MyDataSection />
    </>
  );
}
