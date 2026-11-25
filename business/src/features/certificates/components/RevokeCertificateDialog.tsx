"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { RevokeCertificateValues } from "../schemas/certificate.schema";
import { revokeCertificateSchema } from "../schemas/certificate.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";

interface RevokeCertificateDialogProps {
  certificateNumber: string;
  /** Libellé du document révoqué (par défaut « le certificat »). */
  documentLabel?: string;
  /** Mode contrôlé (ouverture depuis un menu d'actions) : pas de bouton déclencheur. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRevoke: (values: RevokeCertificateValues) => Promise<unknown>;
}

/** Révocation d'un certificat (ENT-44): le motif est obligatoire et conservé sur le certificat. */
export function RevokeCertificateDialog({
  certificateNumber,
  documentLabel = "le certificat",
  onRevoke,
  open: controlledOpen,
  onOpenChange,
}: RevokeCertificateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RevokeCertificateValues>({
    resolver: zodResolver(revokeCertificateSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: RevokeCertificateValues) {
    setSubmitError(null);
    try {
      await onRevoke(values);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Révocation impossible.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitError(null);
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Révoquer
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Révoquer {documentLabel} {certificateNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">
            La révocation est définitive: {documentLabel} ne sera plus reconnu comme valide lors de sa
            vérification publique.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Motif de la révocation</Label>
            <Textarea id="reason" rows={3} placeholder="Ex. : certificat délivré par erreur." aria-invalid={Boolean(errors.reason)} {...register("reason")} />
            {errors.reason && <p className="text-xs text-danger">{errors.reason.message}</p>}
          </div>
          {submitError && <p className="text-xs text-danger">{submitError}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Révoquer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
