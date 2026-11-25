import type { LegalDocument } from "../api/legal.server";

import { formatDate } from "@/lib/format";
import { getCopy, getLocale } from "@/lib/i18n/server";

/**
 * Affiche le texte d'un document légal. Le contenu est du texte brut : chaque paragraphe (séparé par une ligne vide)
 * est rendu comme un nœud texte React, donc jamais interprété comme du HTML (pas d'injection possible).
 */
export async function LegalDocumentView({ document }: { document: LegalDocument }) {
  const copy = await getCopy();
  const locale = await getLocale();
  const paragraphs = document.content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <article className="max-w-3xl">
      <p className="text-sm text-subtle">
        {copy.legal.version(document.version)}
        {document.publishedAt ? ` · ${copy.legal.publishedOn(formatDate(document.publishedAt, locale))}` : ""}
      </p>
      <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
