"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCopy } from "@/lib/i18n/client";

/** Saisie manuelle d'un numéro de certificat (le lien du QR code mène directement à /verify/[number]). */
export function VerifyForm({ initial = "" }: { initial?: string }) {
  const copy = useCopy();
  const router = useRouter();
  const [number, setNumber] = useState(initial);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const value = number.trim();
        if (value) router.push(`/verify/${encodeURIComponent(value)}`);
      }}
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="certificate-number">{copy.verify.formLabel}</Label>
        <Input id="certificate-number" placeholder={copy.placeholders.certificateNumber} value={number} onChange={(e) => setNumber(e.target.value)} autoComplete="off" required />
      </div>
      <Button type="submit">{copy.verify.formSubmit}</Button>
    </form>
  );
}
