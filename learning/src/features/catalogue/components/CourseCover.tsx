import { GraduationCap } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface CourseCoverProps {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Couverture de formation (next/image, ratio 16/9) avec repli graphique si absente. */
export function CourseCover({ src, alt, sizes, priority, className }: CourseCoverProps) {
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-primary/10", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
          <GraduationCap className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
