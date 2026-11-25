"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";

import { useAddQuestion } from "../hooks/useAssessmentMutations";
import type { AssessmentScope, CreateQuestionValues, QuestionType } from "../schemas/assessment.schema";
import { QUESTION_TYPE_LABELS } from "../schemas/assessment.schema";

import { useQuestionForm } from "./useQuestionForm";

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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";

/** Dialogue d'ajout d'une question de quiz ou d'examen (ENT-27/ENT-34). Pas d'édition : le backend n'expose aucune route de modification. */
export function AddQuestionDialog({ scope }: { scope: AssessmentScope }) {
  const [open, setOpen] = useState(false);
  const addQuestion = useAddQuestion(scope);

  const form = useQuestionForm();
  const { register, control, handleSubmit, watch, fields, append, remove, errors } = form;
  const type = watch("type");
  const isMultiple = type === "MULTIPLE_CHOICE";
  const isTrueFalse = type === "TRUE_FALSE";

  async function onSubmit(values: CreateQuestionValues) {
    await addQuestion.mutateAsync(values);
    form.reset();
    setOpen(false);
  }

  const optionsError = errors.options?.message ?? errors.options?.root?.message;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Ajouter une question
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => form.changeType(value as QuestionType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-points">Points</Label>
              <Input
                id="question-points"
                placeholder="Ex. : 2"
                type="number"
                min={1}
                {...register("points", { valueAsNumber: true })}
              />
              {errors.points && <p className="text-xs text-danger">{errors.points.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="question-statement">Énoncé</Label>
            <Textarea id="question-statement" rows={3} placeholder="Saisissez l'énoncé de la question" {...register("statementHtml")} />
            {errors.statementHtml && <p className="text-xs text-danger">{errors.statementHtml.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              Réponses ({isMultiple ? "cochez toutes les bonnes réponses" : "sélectionnez la bonne réponse"})
            </Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name="correct-option"
                  className="h-4 w-4 shrink-0 accent-brand"
                  aria-label={`Réponse ${index + 1} correcte`}
                  checked={Boolean(watch(`options.${index}.isCorrect`))}
                  onChange={(event) => form.setCorrect(index, event.target.checked)}
                />
                <Input
                  placeholder={`Réponse ${index + 1}`}
                  readOnly={isTrueFalse}
                  {...register(`options.${index}.label`)}
                />
                {!isTrueFalse && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={fields.length <= 2}
                    onClick={() => remove(index)}
                    aria-label="Retirer la réponse"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                )}
              </div>
            ))}
            {errors.options?.map?.((optionError, index) =>
              optionError?.label ? (
                <p key={index} className="text-xs text-danger">
                  Réponse {index + 1} : {optionError.label.message}
                </p>
              ) : null,
            )}
            {optionsError && <p className="text-xs text-danger">{optionsError}</p>}
            {!isTrueFalse && (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ label: "", isCorrect: false })}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une réponse
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="question-explanation">Explication (optionnelle)</Label>
            <Textarea id="question-explanation" rows={2} placeholder="Ex. : explication affichée après la correction" {...register("explanation")} />
          </div>

          {addQuestion.isError && (
            <p className="text-xs text-danger">
              {addQuestion.error instanceof ApiError ? addQuestion.error.message : "Ajout impossible."}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting && <Spinner />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
