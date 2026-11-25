"use client";

import { useMemo } from "react";

import { sanitizeLessonHtml } from "../lib/sanitize-html";

import { cn } from "@/lib/utils";

/** Rendu d'un HTML de leçon assaini (liste blanche) dans un conteneur typographique. */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeLessonHtml(html), [html]);
  return <div className={cn("prose-lesson", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
