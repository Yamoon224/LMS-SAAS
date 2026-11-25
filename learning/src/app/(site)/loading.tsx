import { Skeleton } from "@/components/ui/skeleton";
import { getCopy } from "@/lib/i18n/server";

/** Squelette générique des pages (catalogue en grille de cartes). */
export default async function Loading() {
  const copy = await getCopy();
  return (
    <div role="status" aria-label={copy.common.loading}>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-full max-w-md" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-md border border-line bg-card">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
