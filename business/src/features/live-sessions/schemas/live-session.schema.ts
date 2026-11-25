import { z } from "zod";

/** Doit rester cohérent avec LiveSessionStatus (backend/.../live-sessions/domain/live-session-status.ts). */
export const liveSessionStatusSchema = z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELED"]);
export type LiveSessionStatus = z.infer<typeof liveSessionStatusSchema>;

export const LIVE_SESSION_STATUS_LABELS: Record<LiveSessionStatus, string> = {
  SCHEDULED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELED: "Annulée",
};

/** GET /business/live-sessions/courses/:courseId — DTO aplati (ENT-52/ENT-58). */
export const liveSessionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  moduleId: z.string().nullish(),
  startAt: z.coerce.date(),
  durationMinutes: z.number(),
  capacity: z.number().nullish(),
  status: liveSessionStatusSchema,
  meetLink: z.string().nullish(),
  replayUrl: z.string().nullish(),
});
export type LiveSessionItem = z.infer<typeof liveSessionItemSchema>;

/** Valeur du sélecteur "aucun module" (Radix Select n'accepte pas de valeur vide). */
export const NO_MODULE = "NONE";

/** Formulaire; startAt est une valeur `datetime-local` convertie en ISO 8601 à l'envoi (IsDateString). */
export const scheduleLiveSessionSchema = z.object({
  title: z.string().trim().min(2, "Au moins 2 caractères.").max(200, "200 caractères maximum."),
  startAt: z
    .string()
    .min(1, "Date et heure requises.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide."),
  durationMinutes: z.coerce.number().int("Nombre entier requis.").positive("Durée positive requise."),
  timezone: z.string().trim().min(1, "Fuseau horaire requis."),
  capacity: z
    .union([z.literal(""), z.coerce.number().int("Nombre entier requis.").positive("Capacité positive requise.")])
    .optional(),
  moduleId: z.string(),
});
export type ScheduleLiveSessionFormValues = z.input<typeof scheduleLiveSessionSchema>;
export type ScheduleLiveSessionValues = z.output<typeof scheduleLiveSessionSchema>;

/** Doit rester cohérent avec ScheduleLiveSessionDto. */
export function toScheduleBody(values: ScheduleLiveSessionValues) {
  return {
    title: values.title,
    startAt: new Date(values.startAt).toISOString(),
    durationMinutes: values.durationMinutes,
    timezone: values.timezone,
    ...(typeof values.capacity === "number" ? { capacity: values.capacity } : {}),
    ...(values.moduleId && values.moduleId !== NO_MODULE ? { moduleId: values.moduleId } : {}),
  };
}

/** Doit rester cohérent avec SetReplayUrlDto (IsUrl, ENT-57). */
export const setReplayUrlSchema = z.object({
  replayUrl: z.string().trim().url("URL invalide (https://…)."),
});
export type SetReplayUrlValues = z.infer<typeof setReplayUrlSchema>;

/** GET /business/live-sessions/:id/attendance (ENT-57) : inscrits et statut de présence. */
export const attendeeStatusSchema = z.enum(["PRESENT", "ABSENT", "PENDING"]);
export type AttendeeStatus = z.infer<typeof attendeeStatusSchema>;

export const ATTENDEE_STATUS_LABELS: Record<AttendeeStatus, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  PENDING: "En attente",
};

export const sessionAttendeeSchema = z.object({
  userId: z.string(),
  learnerName: z.string().nullish(),
  email: z.string().nullish(),
  status: attendeeStatusSchema,
  markedManually: z.boolean(),
  markedAt: z.coerce.date().nullish(),
});
export type SessionAttendee = z.infer<typeof sessionAttendeeSchema>;

/** Adresse du fichier .ics d'une session (via le proxy authentifié ; téléchargement). */
export function sessionIcsHref(liveSessionId: string): string {
  return `/api/backend/business/live-sessions/${encodeURIComponent(liveSessionId)}/ics`;
}
