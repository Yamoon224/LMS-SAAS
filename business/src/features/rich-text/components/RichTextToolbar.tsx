"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Table2,
  Underline,
} from "lucide-react";
import { useState } from "react";

import { UrlPrompt } from "./UrlPrompt";

import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? false}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
        active && "border-border bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

type PromptKind = "link" | "image" | null;

/** Barre d'outils de l'éditeur riche (ENT-23) : boutons natifs, donc atteignables au clavier (Tab, Entrée, Espace). */
export function RichTextToolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const [prompt, setPrompt] = useState<PromptKind>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      link: e.isActive("link"),
      table: e.isActive("table"),
    }),
  });
  const chain = () => editor.chain().focus();

  function applyUrl(url: string) {
    if (prompt === "link") chain().extendMarkRange("link").setLink({ href: url }).run();
    if (prompt === "image") chain().setImage({ src: url }).run();
    setPrompt(null);
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border p-1.5">
      <div role="toolbar" aria-label="Mise en forme du texte" className="flex flex-wrap items-center gap-0.5">
        <ToolbarButton label="Gras" active={state.bold} disabled={disabled} onClick={() => chain().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italique" active={state.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Souligné" active={state.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Titre de niveau 2" active={state.h2} disabled={disabled} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Titre de niveau 3" active={state.h3} disabled={disabled} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Liste à puces" active={state.bullet} disabled={disabled} onClick={() => chain().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Liste numérotée" active={state.ordered} disabled={disabled} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Citation" active={state.quote} disabled={disabled} onClick={() => chain().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Bloc de code" active={state.code} disabled={disabled} onClick={() => chain().toggleCodeBlock().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Lien (https)" active={state.link} disabled={disabled} onClick={() => setPrompt("link")}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Image (URL https)" disabled={disabled} onClick={() => setPrompt("image")}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={state.table ? "Supprimer le tableau" : "Insérer un tableau 3 × 3"}
          active={state.table}
          disabled={disabled}
          onClick={() =>
            state.table ? chain().deleteTable().run() : chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {prompt && (
        <UrlPrompt
          label={prompt === "link" ? "Adresse du lien (https://…)" : "Adresse de l'image (https://…)"}
          onSubmit={applyUrl}
          onCancel={() => {
            setPrompt(null);
            editor.commands.focus();
          }}
        />
      )}
    </div>
  );
}
