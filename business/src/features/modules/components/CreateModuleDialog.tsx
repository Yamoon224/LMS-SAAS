"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateModule } from "../hooks/useCreateModule";
import type { CreateModuleValues } from "../schemas/module.schema";
import { createModuleSchema } from "../schemas/module.schema";

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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";

/** Dialogue d'ajout d'un module (ENT-22) — ajouté en fin de programme. */
export function CreateModuleDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const createModule = useCreateModule(courseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateModuleValues>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: { title: "", description: "" },
  });

  async function onSubmit(values: CreateModuleValues) {
    await createModule.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          Ajouter un module
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau module</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-title">Titre</Label>
            <Input id="module-title" placeholder="Module 1 — Les bases" {...register("title")} />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-description">Description</Label>
            <Textarea id="module-description" rows={2} placeholder="Résumé du contenu du module" {...register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="module-duration">Durée estimée (minutes)</Label>
            <Input
              id="module-duration"
              placeholder="Ex. : 90"
              type="number"
              min={1}
              {...register("estimatedDurationMinutes")}
            />
          </div>

          {createModule.isError && (
            <p className="text-xs text-danger">
              {createModule.error instanceof ApiError
                ? createModule.error.message
                : "Création impossible."}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
