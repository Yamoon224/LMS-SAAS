"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { closeLocalSession, deleteMyAccount, fetchMyDataExport } from "../api/my-data.api";
import { deletionErrorMessage } from "../lib/deletion-error";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";

/** Style du bouton destructif (pas de variante dédiée dans le composant Button). */
const DANGER = "bg-red-700 text-white hover:bg-red-800";

/** Téléchargement du JSON côté navigateur, sans passer par une URL publique. */
function downloadJson(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DeleteAccountPanel({ onCancel }: { onCancel: () => void }) {
  const fullCopy = useCopy();
  const copy = fullCopy.myData;
  const placeholders = fullCopy.placeholders;
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password) {
      setFieldError(copy.passwordRequired);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      await deleteMyAccount(password);
      await closeLocalSession();
      toast.success(copy.deleted);
      router.push("/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "COMPTE_DEJA_SUPPRIME") {
        await closeLocalSession();
        router.push("/");
        router.refresh();
        return;
      }
      setFieldError(deletionErrorMessage(error, copy));
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-4 flex max-w-md flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
      noValidate
    >
      <h4 className="text-sm font-semibold text-red-800">{copy.confirmTitle}</h4>
      <p className="text-sm text-red-800">{copy.confirmText}</p>
      <div>
        <label htmlFor="delete-password" className="mb-1 block text-sm font-medium">
          {copy.password}
        </label>
        <PasswordInput
          id="delete-password"
          placeholder={placeholders.password}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "delete-password-error" : undefined}
        />
        {fieldError && (
          <p id="delete-password-error" role="alert" className="mt-1 text-sm text-red-700">
            {fieldError}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={DANGER} disabled={pending}>
          {pending && <Spinner />}
          {copy.confirmDelete}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          {copy.cancel}
        </Button>
      </div>
    </form>
  );
}

/** Section « Mes données » du profil (loi 2013-450) : télécharger mes données, supprimer mon compte. */
export function MyDataSection() {
  const copy = useCopy().myData;
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      downloadJson(await fetchMyDataExport());
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 429 ? copy.tooManyRequests : copy.exportFailed,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="my-data-title" className="mt-10 max-w-xl border-t border-line pt-8">
      <h2 id="my-data-title" className="text-xl font-semibold">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm text-subtle">{copy.intro}</p>

      <div className="mt-6">
        <h3 className="text-base font-medium">{copy.exportTitle}</h3>
        <p className="mt-1 text-sm text-subtle">{copy.exportHint}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => void handleExport()} disabled={exporting}>
          {exporting && <Spinner />}
          {copy.exportButton}
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-medium text-red-800">{copy.deleteTitle}</h3>
        <p className="mt-1 text-sm text-subtle">{copy.deleteWarning}</p>
        {confirming ? (
          <DeleteAccountPanel onCancel={() => setConfirming(false)} />
        ) : (
          <Button type="button" className={`mt-3 ${DANGER}`} onClick={() => setConfirming(true)}>
            {copy.deleteButton}
          </Button>
        )}
      </div>
    </section>
  );
}
