import Link from "next/link";

import { LEGAL_PAGES } from "@/features/legal/legal-pages";
import { getCopy } from "@/lib/i18n/server";

export async function SiteFooter({ tenantName }: { tenantName: string }) {
  const copy = await getCopy();
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {tenantName}. {copy.footer.rights}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href="/verify" className="flex min-h-[44px] items-center hover:text-ink hover:underline">
            {copy.footer.verify}
          </Link>
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/legal/${page.slug}`}
              className="flex min-h-[44px] items-center hover:text-ink hover:underline"
            >
              {(copy.legal.pages[page.slug] ?? page.slug)}
            </Link>
          ))}
          <span>{copy.footer.poweredBy}</span>
        </div>
      </div>
    </footer>
  );
}
