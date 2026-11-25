import { FUNNEL_LABELS } from "../schemas/course-report.schema";
import type { CourseReport } from "../schemas/course-report.schema";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Entonnoir inscrits → démarré → module validé → examen réussi, en barres proportionnelles aux inscrits. */
export function FunnelChart({ funnel }: { funnel: CourseReport["funnel"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entonnoir de progression</CardTitle>
        <CardDescription>Où les apprenants s’arrêtent, en part des inscrits.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {funnel.map((step) => {
            const { label, hint } = FUNNEL_LABELS[step.key];
            return (
              <li key={step.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {step.count} · {step.percentOfEnrolled} %
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${label} : ${step.percentOfEnrolled} % des inscrits`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={step.percentOfEnrolled}
                  className="h-2.5 overflow-hidden rounded-full bg-surface-muted"
                >
                  <div className="h-full rounded-full bg-brand" style={{ width: `${step.percentOfEnrolled}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
