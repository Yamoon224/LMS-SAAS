"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import type { ScheduleLiveSessionFormValues, ScheduleLiveSessionValues } from "../schemas/live-session.schema";
import { NO_MODULE, scheduleLiveSessionSchema } from "../schemas/live-session.schema";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useModules } from "@/features/modules/hooks/useModules";
import { ApiError } from "@/lib/api-client";

interface ScheduleLiveSessionDialogProps {
  courseId: string;
  onSchedule: (values: ScheduleLiveSessionValues) => Promise<unknown>;
}

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Planification d'une session live Google Meet (ENT-52/ENT-53), éventuellement rattachée à un module. */
export function ScheduleLiveSessionDialog({ courseId, onSchedule }: ScheduleLiveSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: modules } = useModules(courseId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleLiveSessionFormValues, unknown, ScheduleLiveSessionValues>({
    resolver: zodResolver(scheduleLiveSessionSchema),
    defaultValues: {
      title: "",
      startAt: "",
      durationMinutes: 60,
      timezone: defaultTimezone(),
      capacity: "",
      moduleId: NO_MODULE,
    },
  });

  async function onSubmit(values: ScheduleLiveSessionValues) {
    setSubmitError(null);
    try {
      await onSchedule(values);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Planification impossible.");
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Planifier une session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planifier une session live</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="live-title">Titre</Label>
            <Input id="live-title" placeholder="Session de questions-réponses" {...register("title")} />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="live-start">Début</Label>
              <Input id="live-start" type="datetime-local" {...register("startAt")} />
              {errors.startAt && <p className="text-xs text-danger">{errors.startAt.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="live-duration">Durée (minutes)</Label>
              <Input id="live-duration" placeholder="Ex. : 60" type="number" min={1} {...register("durationMinutes")} />
              {errors.durationMinutes && <p className="text-xs text-danger">{errors.durationMinutes.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="live-timezone">Fuseau horaire</Label>
              <Input id="live-timezone" placeholder="Africa/Abidjan" {...register("timezone")} />
              {errors.timezone && <p className="text-xs text-danger">{errors.timezone.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="live-capacity">Capacité (optionnel)</Label>
              <Input id="live-capacity" placeholder="Ex. : 100" type="number" min={1} {...register("capacity")} />
              {errors.capacity && <p className="text-xs text-danger">{errors.capacity.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="live-module">Module (optionnel)</Label>
            <Controller
              control={control}
              name="moduleId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="live-module">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MODULE}>Toute la formation</SelectItem>
                    {(modules ?? []).map((courseModule) => (
                      <SelectItem key={courseModule.id} value={courseModule.id}>
                        {courseModule.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Planifier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
