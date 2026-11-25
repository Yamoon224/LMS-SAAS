import { cn } from "@/lib/utils";

const SIZES = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" } as const;

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Logo d'une entreprise ; à défaut, ses initiales sur la couleur de marque. */
export function TenantLogo({ name, logoUrl, size = "sm", className }: { name: string; logoUrl?: string | null; size?: keyof typeof SIZES; className?: string }) {
  if (logoUrl) {
    return (
      // Logo téléversé par l'entreprise : URL libre, donc <img> et non next/image.
      <img src={logoUrl} alt={`Logo de ${name}`} className={cn("shrink-0 rounded-md border border-border bg-surface object-contain", SIZES[size], className)} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-md bg-brand/15 font-semibold text-brand", SIZES[size], className)}
    >
      {initialsOf(name)}
    </span>
  );
}
