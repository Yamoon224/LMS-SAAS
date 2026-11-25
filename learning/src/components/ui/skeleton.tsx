import { cn } from "@/lib/utils";

/** Bloc de chargement ; l'animation est neutralisée par prefers-reduced-motion (globals.css). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-ink/10", className)} {...props} />;
}
