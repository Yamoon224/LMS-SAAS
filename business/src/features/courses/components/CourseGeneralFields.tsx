import type { FieldValues, Path, UseFormRegister } from "react-hook-form";

import type { CourseType, ProgressionMode } from "../schemas/course.schema";
import { COURSE_TYPE_LABELS, PROGRESSION_MODE_LABELS } from "../schemas/course.schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Champs communs à CreateCourseValues et UpdateCourseValues (texte/nombre).
 * `type` est volontairement exclu : immuable après création (ENT-17), donc
 * jamais présent dans UpdateCourseValues — seul le formulaire de création le
 * rend éditable, via les props `type`/`onTypeChange` dédiées ci-dessous.
 */
export interface CourseGeneralFieldValues extends FieldValues {
  title?: string;
  subtitle?: string;
  description?: string;
  progressionMode?: ProgressionMode;
  category?: string;
  level?: string;
  estimatedDurationMinutes?: number;
  coverImageUrl?: string;
}

interface CourseGeneralFieldsProps<TFieldValues extends CourseGeneralFieldValues> {
  register: UseFormRegister<TFieldValues>;
  errors: {
    title?: { message?: string };
    sourceLocale?: { message?: string };
    coverImageUrl?: { message?: string };
    estimatedDurationMinutes?: { message?: string };
  };
  progressionMode: ProgressionMode;
  onProgressionModeChange: (value: ProgressionMode) => void;
  /**
   * Type de formation (ENT-17) et langue source : immuables après création.
   * Non fournis (ou `sourceLocale` seul en lecture) depuis le formulaire
   * d'édition, qui n'expose pas ces champs (UpdateCourseDto ne les accepte
   * pas).
   */
  type?: CourseType;
  onTypeChange?: (value: CourseType) => void;
  sourceLocale?: string;
}

/** Informations générales d'une formation (ENT-15/ENT-17/ENT-19). */
export function CourseGeneralFields<TFieldValues extends CourseGeneralFieldValues>({
  register,
  errors,
  type,
  progressionMode,
  onTypeChange,
  onProgressionModeChange,
  sourceLocale,
}: CourseGeneralFieldsProps<TFieldValues>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations générales</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            placeholder="Introduction à la comptabilité"
            {...register("title" as Path<TFieldValues>)}
          />
          {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="subtitle">Sous-titre</Label>
          <Input id="subtitle" placeholder="Maîtrisez les bases en quelques semaines" {...register("subtitle" as Path<TFieldValues>)} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} placeholder="Décrivez les objectifs et le contenu de la formation" {...register("description" as Path<TFieldValues>)} />
        </div>

        {type && onTypeChange && (
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => onTypeChange(value as CourseType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Immuable après création (examen final et certificat si certifiante).
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Progression</Label>
          <Select
            value={progressionMode}
            onValueChange={(value) => onProgressionModeChange(value as ProgressionMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROGRESSION_MODE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {onTypeChange ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sourceLocale">Langue source</Label>
            <Input
              id="sourceLocale"
              placeholder="fr"
              {...register("sourceLocale" as Path<TFieldValues>)}
            />
            {errors.sourceLocale && <p className="text-xs text-danger">{errors.sourceLocale.message}</p>}
            <p className="text-xs text-muted-foreground">Immuable après création.</p>
          </div>
        ) : (
          sourceLocale && (
            <div className="flex flex-col gap-1.5">
              <Label>Langue source</Label>
              <p className="text-sm font-medium">{sourceLocale}</p>
              <p className="text-xs text-muted-foreground">Immuable après création.</p>
            </div>
          )
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Catégorie</Label>
          <Input id="category" placeholder="Ex. : Gestion" {...register("category" as Path<TFieldValues>)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">Niveau</Label>
          <Input id="level" placeholder="Ex. : Débutant" {...register("level" as Path<TFieldValues>)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedDurationMinutes">Durée estimée (minutes)</Label>
          <Input
            id="estimatedDurationMinutes"
            placeholder="Ex. : 120"
            type="number"
            min={1}
            {...register("estimatedDurationMinutes" as Path<TFieldValues>)}
          />
          {errors.estimatedDurationMinutes && (
            <p className="text-xs text-danger">{errors.estimatedDurationMinutes.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="coverImageUrl">Image de couverture (URL)</Label>
          <Input
            id="coverImageUrl"
            placeholder="https://..."
            {...register("coverImageUrl" as Path<TFieldValues>)}
          />
          {errors.coverImageUrl && (
            <p className="text-xs text-danger">{errors.coverImageUrl.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
