"use client";

import { useLanguages, useSetLanguageEnabled } from "../hooks/useLanguages";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

/** ADM-40 : activation et désactivation des langues de la plateforme (interface et traduction IA). */
export function LanguagesPage() {
  const { data, isLoading, isError, error } = useLanguages();
  const setEnabled = useSetLanguageEnabled();

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger les langues." error={error} />;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {data.map((language) => (
              <li key={language.code} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span lang={language.code} dir={language.rtl ? "rtl" : "ltr"}>
                      {language.nativeName}
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">{language.code}</span>
                    {language.rtl && <Badge variant="secondary">Droite à gauche</Badge>}
                    {language.locked && <Badge variant="info">Langue par défaut</Badge>}
                  </p>
                </div>
                <Switch
                  checked={language.enabled}
                  disabled={language.locked || setEnabled.isPending}
                  aria-label={`${language.enabled ? "Désactiver" : "Activer"} ${language.nativeName}`}
                  onCheckedChange={(enabled) => setEnabled.mutate({ code: language.code, enabled })}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Une langue désactivée n&apos;est plus proposée pour le profil des apprenants ni comme langue cible d&apos;une
        traduction IA. Les traductions et préférences déjà enregistrées ne sont ni supprimées ni modifiées.
      </p>
    </div>
  );
}
