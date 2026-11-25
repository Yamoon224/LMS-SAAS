"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { ExtendAccessValues } from "../schemas/enrollment.schema";
import { extendAccessSchema } from "../schemas/enrollment.schema";

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

interface ExtendAccessDialogProps {
  isPending: boolean;
  onExtend: (values: ExtendAccessValues) => Promise<unknown>;
}

/** Prolongation de l'accès d'un apprenant (ENT-64). */
export function ExtendAccessDialog({ isPending, onExtend }: ExtendAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExtendAccessValues>({
    resolver: zodResolver(extendAccessSchema),
    defaultValues: { additionalDays: 30 },
  });

  async function onSubmit(values: ExtendAccessValues) {
    setSubmitError(null);
    try {
      await onExtend(values);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Prolongation impossible.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending}>
          {isPending && <Spinner />}
          Prolonger l&apos;accès
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prolonger l&apos;accès</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="additionalDays">Jours supplémentaires</Label>
            <Input id="additionalDays" placeholder="Ex. : 30" type="number" min={1} {...register("additionalDays")} />
            {errors.additionalDays && (
              <p className="text-xs text-danger">{errors.additionalDays.message}</p>
            )}
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Prolonger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
