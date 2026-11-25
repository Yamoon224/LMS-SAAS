import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCopy } from "@/lib/i18n/server";

export default async function NotFound() {
  const copy = await getCopy();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">{copy.common.pageNotFound}</h1>
      <Button asChild>
        <Link href="/courses">{copy.course.backToCatalogue}</Link>
      </Button>
    </main>
  );
}
