import { cn } from "@/lib/utils";

/** Bloc de chargement animé (pattern shadcn/ui), utilisé en remplacement des textes "Chargement…" bruts. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-border/60", className)}
      {...props}
    />
  );
}
