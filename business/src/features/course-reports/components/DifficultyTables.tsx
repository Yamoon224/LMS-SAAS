import type { CourseReport } from "../schemas/course-report.schema";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Modules dont le quiz est le plus souvent échoué : points de blocage. */
export function BlockingModules({ modules }: { modules: CourseReport["blockingModules"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Points de blocage</CardTitle>
        <CardDescription>Modules dont le quiz est le plus souvent échoué.</CardDescription>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <EmptyNote>Aucune tentative de quiz pour le moment.</EmptyNote>
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {modules.map((module) => (
              <li key={module.moduleId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">Module {module.order} · </span>
                  {module.title}
                </span>
                <span className="shrink-0 tabular-nums">
                  <strong>{module.failureRatePercent} %</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    d’échec ({module.failedAttempts}/{module.attempts})
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** Questions les plus échouées, avec leur origine (module ou examen). */
export function FailedQuestions({ questions }: { questions: CourseReport["failedQuestions"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions les plus échouées</CardTitle>
        <CardDescription>Questions posées au moins 3 fois, pour repérer un énoncé ou un cours à revoir.</CardDescription>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <EmptyNote>Pas encore assez de réponses pour dégager des questions difficiles.</EmptyNote>
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {questions.map((question) => (
              <li key={question.questionId} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p>{question.statement}</p>
                  <p className="text-xs text-muted-foreground">{question.scope}</p>
                </div>
                <span className="shrink-0 tabular-nums">
                  <strong>{question.failureRatePercent} %</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    ({question.wrong}/{question.asked})
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
