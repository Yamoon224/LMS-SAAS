import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de chargement d'un tableau / d'une liste. */
export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Chargement">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
