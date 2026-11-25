"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useGrantAttempts } from "../hooks/useAssessmentMutations";
import type { AssessmentScope, GrantAttemptsValues } from "../schemas/assessment.schema";
import { grantAttemptsSchema } from "../schemas/assessment.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useModules } from "@/features/modules/hooks/useModules";
import { ApiError } from "@/lib/api-client";

const EXAM_TARGET = "exam";

/**
 * Tentatives supplémentaires pour un apprenant (ENT-31/RG-10) : sur l'examen final de la
 * formation ou sur le quiz d'un module, via les routes `grant-attempts` du backend. Le backend
 * répond 404 si l'évaluation visée n'est pas encore configurée — l'erreur est affichée telle quelle.
 */
export function GrantAttemptsDialog({
  courseId,
  enrollmentId,
}: {
  courseId: string;
  enrollmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(EXAM_TARGET);
  const [granted, setGranted] = useState(false);
  const { data: modules } = useModules(courseId);
  const grantAttempts = useGrantAttempts();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GrantAttemptsValues>({
    resolver: zodResolver(grantAttemptsSchema),
    defaultValues: { extraAttempts: 1 },
  });

  async function onSubmit(values: GrantAttemptsValues) {
    setGranted(false);
    const scope: AssessmentScope =
      target === EXAM_TARGET ? { kind: "exam", courseId } : { kind: "quiz", moduleId: target };
    await grantAttempts.mutateAsync({ scope, enrollmentId, extraAttempts: values.extraAttempts });
    setGranted(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setGranted(false);
          grantAttempts.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Accorder des tentatives
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tentatives supplémentaires</DialogTitle>
          <DialogDescription>
            Ajoute des tentatives à cet apprenant uniquement, sans modifier le plafond de l&apos;évaluation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label>Évaluation</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EXAM_TARGET}>Examen final</SelectItem>
                {modules?.map((courseModule) => (
                  <SelectItem key={courseModule.id} value={courseModule.id}>
                    Quiz — {courseModule.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="extraAttempts">Tentatives supplémentaires</Label>
            <Input
              id="extraAttempts"
              placeholder="Ex. : 1"
              type="number"
              min={1}
              {...register("extraAttempts", { valueAsNumber: true })}
            />
            {errors.extraAttempts && <p className="text-xs text-danger">{errors.extraAttempts.message}</p>}
          </div>

          {grantAttempts.isError && (
            <p className="text-xs text-danger">
              {grantAttempts.error instanceof ApiError ? grantAttempts.error.message : "Action impossible."}
            </p>
          )}
          {granted && <p className="text-xs text-success">Tentatives accordées.</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Accorder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
