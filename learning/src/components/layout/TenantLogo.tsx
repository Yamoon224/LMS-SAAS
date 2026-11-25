import { GraduationCap } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface TenantLogoProps {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md";
}

/** Logo du tenant (URL validée côté serveur) ; repli sur l'icône de marque. */
export function TenantLogo({ name, logoUrl, size = "sm" }: TenantLogoProps) {
  const box = size === "md" ? "h-10 w-10" : "h-9 w-9";
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={64}
        height={64}
        unoptimized
        className={cn(box, "shrink-0 rounded-md bg-card object-contain")}
      />
    );
  }
  return (
    <span className={cn(box, "flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground")}>
      <GraduationCap className={size === "md" ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
      <span className="sr-only">{name}</span>
    </span>
  );
}
