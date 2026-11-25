"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { SetReplayUrlValues } from "../schemas/live-session.schema";
import { setReplayUrlSchema } from "../schemas/live-session.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

interface ReplayUrlDialogProps {
  initialUrl?: string | null;
  /** Mode contrôlé (ouverture depuis un menu d'actions) : pas de bouton déclencheur. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (values: SetReplayUrlValues) => Promise<unknown>;
}

/** Dépôt du lien de replay d'une session (ENT-57). */
export function ReplayUrlDialog({ initialUrl, onSave, open: controlledOpen, onOpenChange }: ReplayUrlDialogProps) {
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
    formState: { errors, isSubmitting },
  } = useForm<SetReplayUrlValues>({
    resolver: zodResolver(setReplayUrlSchema),
    defaultValues: { replayUrl: initialUrl ?? "" },
  });

  async function onSubmit(values: SetReplayUrlValues) {
    setSubmitError(null);
    try {
      await onSave(values);
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
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
            {initialUrl ? "Modifier le replay" : "Ajouter le replay"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lien de replay</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="replayUrl">URL du replay</Label>
            <Input id="replayUrl" placeholder="https://" aria-invalid={Boolean(errors.replayUrl)} {...register("replayUrl")} />
            {errors.replayUrl && <p className="text-xs text-danger">{errors.replayUrl.message}</p>}
          </div>
          {submitError && <p className="text-xs text-danger">{submitError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
