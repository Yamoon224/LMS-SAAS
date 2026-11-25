"use client";

import { useState } from "react";

import { useNotificationTemplates } from "../hooks/useNotificationTemplates";
import { LOCALE_LABELS, templateInfo } from "../schemas/notification-template.schema";
import type { NotificationTemplate } from "../schemas/notification-template.schema";

import { TemplateEditDialog } from "./TemplateEditDialog";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

function groupByKey(templates: NotificationTemplate[]): [string, NotificationTemplate[]][] {
  const groups = new Map<string, NotificationTemplate[]>();
  for (const template of templates) {
    groups.set(template.templateKey, [...(groups.get(template.templateKey) ?? []), template]);
  }
  return [...groups.entries()];
}

/** ADM-38 : modèles d'e-mails multilingues modifiables, avec retour au texte d'origine. */
export function NotificationTemplatesPage() {
  const { data, isLoading, isError, error } = useNotificationTemplates();
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError || !data) return <ErrorBanner title="Impossible de charger les modèles." error={error} />;

  return (
    <div className="flex flex-col gap-4">
      {groupByKey(data).map(([templateKey, versions]) => {
        const info = templateInfo(templateKey);
        return (
          <Card key={templateKey}>
            <CardHeader>
              <CardTitle>{info.label}</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {versions.map((template) => (
                  <li
                    key={template.locale}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {LOCALE_LABELS[template.locale] ?? template.locale}
                        {template.isCustomized && <Badge variant="info">Personnalisé</Badge>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{template.subject}</p>
                      {template.updatedAt && (
                        <p className="text-xs text-muted-foreground">Modifié le {formatDate(template.updatedAt)}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing(template)}>
                      Modifier
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
      <TemplateEditDialog template={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </div>
  );
}
