"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { isEditorHtmlEmpty, sanitizeEditorHtml } from "../lib/sanitize-html";
import { normalizeHttpsUrl } from "../lib/url";

import { RichTextToolbar } from "./RichTextToolbar";

import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  /** Identifiant du champ (le `<label htmlFor>` associé désigne la zone d'édition). */
  id: string;
  /** Libellé accessible de la zone d'édition. */
  label: string;
  value: string;
  /** Reçoit un HTML déjà assaini côté client ("" si l'éditeur est vide). */
  onChange: (html: string) => void;
  disabled?: boolean;
}

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
  // Liens https uniquement (ENT-23) ; rel sécurisé ; pas d'ouverture au clic dans l'éditeur.
  Link.configure({
    openOnClick: false,
    autolink: false,
    protocols: ["https"],
    isAllowedUri: (url) => normalizeHttpsUrl(url) !== null,
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),
  Image.configure({ allowBase64: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
];

/**
 * Éditeur de texte riche Tiptap (ENT-23), alternative libre à CKEditor 5 : titres, gras/italique/souligné, listes,
 * liens https, images (URL https), tableaux, citations, code. La sortie est assainie côté client avant d'être remontée ;
 * le backend la nettoie à son tour (autorité). Zone d'édition au rôle `textbox` multiligne, atteignable au clavier.
 */
export function RichTextEditor({ id, label, value, onChange, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: sanitizeEditorHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: "tiptap-content min-h-40 px-3 py-2 text-sm focus-visible:outline-none [&_table]:w-full [&_td]:border [&_td]:p-1 [&_th]:border [&_th]:bg-muted [&_th]:p-1 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand [&_a]:underline [&_img]:max-w-full",
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = sanitizeEditorHtml(current.getHTML());
      onChange(isEditorHtmlEmpty(html) ? "" : html);
    },
  });

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        disabled && "opacity-60",
      )}
    >
      {editor && <RichTextToolbar editor={editor} disabled={disabled} />}
      <EditorContent editor={editor} />
    </div>
  );
}
