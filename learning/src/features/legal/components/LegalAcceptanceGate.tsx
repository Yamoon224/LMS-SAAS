"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAcceptLegal, usePendingLegal } from "../hooks/useLegalAcceptance";
import { legalHref } from "../legal-pages";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { logout } from "@/features/auth/api/auth.api";
import { ApiError, errorDetail } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";

/**
 * ADM-41 : écran d'acceptation des conditions. Affiché à l'apprenant connecté tant que la version courante des
 * documents obligatoires n'est pas acceptée (première connexion, ou nouvelle version publiée). Il n'est pas fermable,
 * sauf en se déconnectant, et reste masqué sur les pages `/legal` pour que les textes puissent être lus.
 */
export function LegalAcceptanceGate({ authenticated }: { authenticated: boolean }) {
  const copy = useCopy();
  const pathname = usePathname();
  const router = useRouter();
  const pending = usePendingLegal(authenticated);
  const accept = useAcceptLegal();
  const [checked, setChecked] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const documents = pending.data ?? [];
  const visible = authenticated && documents.length > 0 && !pathname.startsWith("/legal");

  useEffect(() => {
    if (visible) headingRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  async function onAccept() {
    try {
      await accept.mutateAsync(documents);
      setChecked(false);
    } catch (error) {
      const changed = error instanceof ApiError && error.code === "VERSION_DOCUMENT_LEGAL_PERIMEE";
      setChecked(false);
      toast.error(changed ? copy.legal.gateVersionChanged : (errorDetail(error) ?? copy.legal.gateFailed));
    }
  }

  async function onLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-gate-title"
        className="flex max-h-full w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-md bg-card p-6 shadow-lift"
      >
        <div>
          <h2 id="legal-gate-title" ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">
            {copy.legal.gateTitle}
          </h2>
          <p className="mt-2 text-sm text-subtle">{copy.legal.gateIntro}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.type}>
              <Link
                href={legalHref(document.type)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center rounded-lg border border-line px-3 text-sm font-medium text-primary hover:bg-primary/5"
              >
                {copy.legal.gateRead(document.title, document.version)}
                <span className="sr-only"> — {copy.legal.gateOpenHint}</span>
              </Link>
            </li>
          ))}
        </ul>

        <label className="flex min-h-[44px] items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-primary"
          />
          <span>{copy.legal.gateCheckbox}</span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" size="lg" disabled={!checked || accept.isPending} onClick={() => void onAccept()}>
            {accept.isPending && <Spinner />}
            {copy.legal.gateAccept}
          </Button>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="min-h-[44px] text-sm text-subtle hover:text-ink hover:underline"
          >
            {copy.legal.gateLogout}
          </button>
        </div>
      </div>
    </div>
  );
}
