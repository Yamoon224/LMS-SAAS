"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrainers } from "@/features/users/hooks/useBusinessUsers";
import type { Trainer } from "@/features/users/schemas/user.schema";

/** Formateurs actifs (GET /business/users/trainers, courses.manage) + identifiants rattachés hors liste. */
function useTrainerOptions(selected: string[]) {
  const query = useTrainers();
  const trainers = query.data ?? [];
  // Formateurs déjà rattachés mais absents de la liste (désactivés, rôle retiré, liste indisponible).
  const knownIds = new Set(trainers.map((trainer) => trainer.id));

  return {
    loading: query.isLoading,
    failed: query.isError,
    trainers,
    unknownSelected: selected.filter((id) => !knownIds.has(id)),
  };
}

function filterTrainers(trainers: Trainer[], query: string): Trainer[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return trainers;
  return trainers.filter((trainer) => (trainer.fullName ?? "").toLowerCase().includes(normalized));
}

function UnavailableNotice() {
  return (
    <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning" role="status">
      Liste des formateurs indisponible (droit « Formations » requis ou service injoignable). Les formateurs déjà
      rattachés sont conservés.
    </p>
  );
}

interface CourseInstructorsFieldProps {
  error?: string;
  /** Identifiants sélectionnés (champ `instructorIds`, payload inchangé). */
  value: string[];
  onChange: (instructorIds: string[]) => void;
}

/**
 * Sélection des formateurs parmi les utilisateurs internes du tenant ayant un rôle « Formateur »
 * (ENT-10 → ENT-15). Le payload reste `instructorIds: string[]`. Si la liste ne peut pas être
 * chargée (droit `courses.manage` requis), les identifiants déjà choisis restent affichés
 * et conservés tels quels.
 */
export function CourseInstructorsField({ error, value, onChange }: CourseInstructorsFieldProps) {
  const [query, setQuery] = useState("");
  const { loading, failed, trainers, unknownSelected } = useTrainerOptions(value);
  const visible = filterTrainers(trainers, query);

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((existing) => existing !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formateurs</CardTitle>
        <CardDescription>
          Formateurs actifs de votre entreprise. Au moins un est requis.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading && <Skeleton className="h-24 w-full" />}

        {failed && <UnavailableNotice />}

        {!loading && !failed && trainers.length > 6 && (
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher un formateur"
            aria-label="Rechercher un formateur"
          />
        )}

        {!loading && !failed && trainers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun formateur dans votre entreprise. Invitez-en un depuis « Utilisateurs & rôles ».
          </p>
        )}

        {visible.length > 0 && (
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto" role="group" aria-label="Formateurs">
            {visible.map((trainer) => {
              const id = `instructor-${trainer.id}`;
              return (
                <label
                  key={trainer.id}
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-accent has-[:checked]:border-brand/40 has-[:checked]:bg-brand/5 sm:min-h-10"
                >
                  <Checkbox
                    id={id}
                    checked={value.includes(trainer.id)}
                    onChange={(event) => toggle(trainer.id, event.target.checked)}
                  />
                  <span className="min-w-0 truncate font-medium">{trainer.fullName || "Formateur sans nom"}</span>
                </label>
              );
            })}
          </div>
        )}

        {unknownSelected.length > 0 && !loading && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Rattachés (hors liste) :</p>
            {unknownSelected.map((id) => {
              const inputId = `instructor-extra-${id}`;
              return (
                <label
                  key={id}
                  htmlFor={inputId}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm sm:min-h-10"
                >
                  <Checkbox
                    id={inputId}
                    checked
                    onChange={(event) => toggle(id, event.target.checked)}
                  />
                  <span className="truncate font-mono text-xs">{id}</span>
                </label>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
