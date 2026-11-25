"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Liste déroulante AVEC recherche (tous les « select » de l'application). Même API que Radix Select
 * (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) : les écrans n'ont pas changé.
 * Clavier : ↓ ↑ pour naviguer, Entrée pour choisir, Échap pour fermer, saisie pour filtrer (accents ignorés).
 */

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectContextValue {
  value: string;
  options: Option[];
  filtered: Option[];
  query: string;
  setQuery: (query: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  activeValue: string | null;
  setActiveValue: (value: string | null) => void;
  disabled: boolean;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  listId: string;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect(): SelectContextValue {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("Les composants Select doivent être utilisés dans <Select>.");
  return context;
}

/** Texte brut d'un contenu React (libellé d'une option). */
function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Parcourt l'arbre JSX du Select pour retrouver ses `SelectItem` (valeur + libellé), où qu'ils soient. */
function collectOptions(children: React.ReactNode, out: Option[] = []): Option[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: string; disabled?: boolean; children?: React.ReactNode }>(child)) return;
    if (child.type === SelectItem) {
      out.push({ value: String(child.props.value), label: textOf(child.props.children), disabled: child.props.disabled });
      return;
    }
    collectOptions(child.props.children, out);
  });
  return out;
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Select({ value: controlled, defaultValue = "", onValueChange, disabled = false, children }: SelectProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const value = controlled ?? internal;
  const [open, setOpenState] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeValue, setActiveValue] = React.useState<string | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const listId = React.useId();

  const options = React.useMemo(() => collectOptions(children), [children]);
  const filtered = React.useMemo(() => {
    const needle = fold(query.trim());
    return needle ? options.filter((option) => fold(option.label).includes(needle)) : options;
  }, [options, query]);

  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next);
      setQuery("");
      if (next) setActiveValue(options.some((option) => option.value === value) ? value : (options.find((o) => !o.disabled)?.value ?? null));
      else triggerRef.current?.focus({ preventScroll: true });
    },
    [options, value],
  );

  const select = React.useCallback(
    (next: string) => {
      if (controlled === undefined) setInternal(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [controlled, onValueChange, setOpen],
  );

  const context = React.useMemo<SelectContextValue>(
    () => ({ value, options, filtered, query, setQuery, open: open && !disabled, setOpen, select, activeValue, setActiveValue, disabled, triggerRef, listId }),
    [value, options, filtered, query, open, disabled, setOpen, select, activeValue, listId],
  );

  return <SelectContext.Provider value={context}>{children}</SelectContext.Provider>;
}

/** Affiche le libellé de l'option choisie, ou le texte indicatif. */
export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, options } = useSelect();
  const selected = options.find((option) => option.value === value);
  return <span className={cn(!selected && "text-muted-foreground/80")}>{selected ? selected.label : placeholder}</span>;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, onKeyDown, onClick, ...props }, ref) => {
    const context = useSelect();
    const hasValue = context.options.some((option) => option.value === context.value);

    return (
      <button
        ref={(node) => {
          context.triggerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        role="combobox"
        aria-expanded={context.open}
        aria-haspopup="listbox"
        aria-controls={context.open ? context.listId : undefined}
        data-state={context.open ? "open" : "closed"}
        data-placeholder={hasValue ? undefined : ""}
        disabled={context.disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) context.setOpen(!context.open);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            context.setOpen(true);
          }
        }}
        className={cn(
          "group flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-1 text-left text-base shadow-sm transition-colors hover:border-muted-foreground/40 focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/30 aria-[invalid=true]:border-danger sm:h-9 sm:text-sm [&>span]:truncate disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
      </button>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

interface Position {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  fixed: boolean;
}

/** Position du menu sous le champ (au-dessus s'il manque de place). Dans une modale, le menu y est rendu pour rester dans son piège de focus. */
function usePopoverPosition(open: boolean, trigger: HTMLElement | null, container: HTMLElement | null) {
  const [position, setPosition] = React.useState<Position | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !trigger) return;
    function update() {
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.max(rect.width, 224);
      const below = window.innerHeight - rect.bottom;
      const placeAbove = below < 280 && rect.top > below;
      if (container) {
        const box = container.getBoundingClientRect();
        const left = Math.min(rect.left - box.left + container.scrollLeft, Math.max(container.clientWidth - width - 8, 0));
        setPosition(
          placeAbove
            ? { bottom: container.clientHeight - (rect.top - box.top) + 4 - container.scrollTop, left, width, fixed: false }
            : { top: rect.bottom - box.top + container.scrollTop + 4, left, width, fixed: false },
        );
      } else {
        const left = Math.min(rect.left, Math.max(window.innerWidth - width - 8, 8));
        setPosition(placeAbove ? { bottom: window.innerHeight - rect.top + 4, left, width, fixed: true } : { top: rect.bottom + 4, left, width, fixed: true });
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, trigger, container]);

  return position;
}

export function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement> & { position?: string }) {
  const context = useSelect();
  const { open, triggerRef, filtered, activeValue, setActiveValue, select, setOpen, query, setQuery, listId } = context;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const trigger = triggerRef.current;
  const dialog = trigger?.closest<HTMLElement>('[role="dialog"]') ?? null;
  const position = usePopoverPosition(open, trigger, dialog);

  const positioned = position !== null;
  React.useEffect(() => {
    if (open && positioned) inputRef.current?.focus({ preventScroll: true });
  }, [open, positioned]);

  // Fermeture au clic en dehors du champ et du menu.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen, triggerRef]);

  // L'option active reste visible pendant la navigation au clavier.
  React.useEffect(() => {
    if (!open || activeValue === null) return;
    panelRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, activeValue]);

  if (!open || !position) return null;

  function onKeyDown(event: React.KeyboardEvent) {
    const enabled = filtered.filter((option) => !option.disabled);
    const index = enabled.findIndex((option) => option.value === activeValue);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (enabled.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveValue(enabled[(index + step + enabled.length) % enabled.length]?.value ?? null);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeValue !== null && enabled.some((option) => option.value === activeValue)) select(activeValue);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const panel = (
    <div
      ref={panelRef}
      role="presentation"
      onKeyDown={onKeyDown}
      style={{
        position: position.fixed ? "fixed" : "absolute",
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        width: position.width,
      }}
      className={cn("z-[60] overflow-hidden rounded-md border border-border bg-surface text-foreground shadow-pop animate-pop-in", className)}
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            const first = context.options.find((option) => !option.disabled && fold(option.label).includes(fold(event.target.value.trim())));
            setActiveValue(first?.value ?? null);
          }}
          role="searchbox"
          aria-label="Rechercher dans la liste"
          aria-controls={listId}
          placeholder="Rechercher…"
          autoComplete="off"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1">
        {children}
        {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>}
      </div>
    </div>
  );

  return createPortal(panel, dialog ?? document.body);
}

export const SelectItem = React.forwardRef<HTMLDivElement, { value: string; disabled?: boolean; className?: string; children: React.ReactNode }>(
  ({ value, disabled, className, children }, ref) => {
    const { value: selected, filtered, activeValue, setActiveValue, select } = useSelect();
    if (!filtered.some((option) => option.value === value)) return null;
    const isSelected = selected === value;
    const isActive = activeValue === value;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        data-active={isActive}
        onPointerMove={() => !disabled && !isActive && setActiveValue(value)}
        tabIndex={-1}
        onClick={() => !disabled && select(value)}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) select(value);
        }}
        className={cn(
          "relative flex min-h-10 w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none transition-colors sm:min-h-8",
          isActive && "bg-accent",
          isSelected && "font-medium",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{isSelected && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}</span>
        {children}
      </div>
    );
  },
);
SelectItem.displayName = "SelectItem";
