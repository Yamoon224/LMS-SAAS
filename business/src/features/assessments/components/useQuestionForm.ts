"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import type { CreateQuestionValues, QuestionType } from "../schemas/assessment.schema";
import { createQuestionSchema } from "../schemas/assessment.schema";

const TRUE_FALSE_OPTIONS = [
  { label: "Vrai", isCorrect: true },
  { label: "Faux", isCorrect: false },
];

const EMPTY_OPTIONS = [
  { label: "", isCorrect: true },
  { label: "", isCorrect: false },
];

const DEFAULT_VALUES: CreateQuestionValues = {
  type: "SINGLE_CHOICE",
  statementHtml: "",
  explanation: "",
  points: 1,
  options: EMPTY_OPTIONS,
};

/**
 * Formulaire de création de question : état RHF + règles propres au type (vrai/faux = options
 * fixes, choix unique = une seule bonne réponse cochée, choix multiple = cases libres).
 */
export function useQuestionForm() {
  const form = useForm<CreateQuestionValues>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { control, setValue, getValues } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "options" });

  function changeType(next: QuestionType) {
    const previous = getValues("type");
    setValue("type", next);
    if (next === "TRUE_FALSE") {
      setValue("options", TRUE_FALSE_OPTIONS.map((option) => ({ ...option })));
    } else if (previous === "TRUE_FALSE") {
      setValue("options", EMPTY_OPTIONS.map((option) => ({ ...option })));
    } else if (next === "SINGLE_CHOICE") {
      // Une seule bonne réponse : on ne garde que la première cochée.
      let seen = false;
      setValue(
        "options",
        getValues("options").map((option) => {
          const keep = option.isCorrect && !seen;
          if (option.isCorrect) seen = true;
          return { ...option, isCorrect: keep };
        }),
      );
    }
  }

  function setCorrect(index: number, checked: boolean) {
    if (getValues("type") === "MULTIPLE_CHOICE") {
      setValue(`options.${index}.isCorrect`, checked, { shouldValidate: true });
      return;
    }
    getValues("options").forEach((_, optionIndex) => {
      setValue(`options.${optionIndex}.isCorrect`, optionIndex === index, { shouldValidate: true });
    });
  }

  return {
    register: form.register,
    control,
    handleSubmit: form.handleSubmit,
    watch: form.watch,
    reset: () => form.reset(DEFAULT_VALUES),
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    fields,
    append,
    remove,
    changeType,
    setCorrect,
  };
}
