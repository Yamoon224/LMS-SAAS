"use client";

import type { FieldErrors, UseFormReturn } from "react-hook-form";

import {
  BORDER_LABELS,
  BORDER_STYLES,
  DESIGN_TAB_FIELDS,
  FONT_FAMILIES,
  FONT_LABELS,
  LANGUAGE_LABELS,
  LANGUAGES,
  LOGO_POSITION_LABELS,
  LOGO_POSITIONS,
  LOGO_SIZE_LABELS,
  LOGO_SIZES,
  ORIENTATION_LABELS,
  ORIENTATIONS,
  PAGE_FORMAT_LABELS,
  PAGE_FORMATS,
  WATERMARK_LABELS,
  WATERMARK_TYPES,
} from "../schemas/certificate-design-form";
import type { DesignFormValues } from "../schemas/certificate-design-form";

import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/** Ce fichier est identique côté admin et business. */
type Form = UseFormReturn<DesignFormValues>;

function msg(errors: FieldErrors<DesignFormValues>, key: keyof DesignFormValues): string | undefined {
  const error = errors[key];
  return error && typeof error === "object" && "message" in error ? String(error.message) : undefined;
}

function SelectField<T extends string>({ form, name, label, options, labels }: { form: Form; name: keyof DesignFormValues; label: string; options: readonly T[]; labels: Record<T, string> }) {
  return (
    <Field id={name} label={label} error={msg(form.formState.errors, name)}>
      <OptionSelect
        id={name}
        value={String(form.watch(name) ?? "")}
        onValueChange={(next) => form.setValue(name, next as never, { shouldDirty: true, shouldValidate: true })}
        options={options.map((value) => ({ value, label: labels[value] }))}
      />
    </Field>
  );
}

function ColorField({ form, name, label, hint }: { form: Form; name: keyof DesignFormValues; label: string; hint?: string }) {
  const value = String(form.watch(name) ?? "");
  return (
    <Field id={name} label={label} hint={hint} error={msg(form.formState.errors, name)}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded border border-border" style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(value) ? value : "transparent" }} />
        <Input id={name} spellCheck={false} placeholder="#1e3a8a" aria-invalid={Boolean(msg(form.formState.errors, name))} {...form.register(name)} />
      </div>
    </Field>
  );
}

function TextField({ form, name, label, placeholder, hint }: { form: Form; name: keyof DesignFormValues; label: string; placeholder?: string; hint?: string }) {
  return (
    <Field id={name} label={label} hint={hint} error={msg(form.formState.errors, name)}>
      <Input id={name} placeholder={placeholder} aria-invalid={Boolean(msg(form.formState.errors, name))} {...form.register(name)} />
    </Field>
  );
}

function RangeField({ form, name, label, min, max, step }: { form: Form; name: "backgroundOpacity" | "watermarkOpacity"; label: string; min: number; max: number; step: number }) {
  const value = form.watch(name);
  return (
    <Field id={name} label={`${label} (${Math.round(value * 100)} %)`} error={msg(form.formState.errors, name)}>
      <input id={name} type="range" min={min} max={max} step={step} className="w-full" {...form.register(name, { valueAsNumber: true })} />
    </Field>
  );
}

function ToggleField({ form, name, label }: { form: Form; name: "showScore" | "showDate" | "showNumber" | "showDuration" | "showQrCode"; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <label htmlFor={name} className="text-sm">
        {label}
      </label>
      <Switch id={name} checked={form.watch(name)} onCheckedChange={(checked) => form.setValue(name, checked, { shouldDirty: true })} />
    </div>
  );
}

const TABS = [
  { id: "layout", label: "Mise en page" },
  { id: "colors", label: "Couleurs & police" },
  { id: "content", label: "Contenu" },
  { id: "signatures", label: "Signatures" },
  { id: "display", label: "Éléments affichés" },
] as const;

/** Sections du design d'un certificat (onglets). Un point rouge signale un onglet contenant une erreur. */
export function DesignFormSections({ form }: { form: Form }) {
  const errors = form.formState.errors;
  const hasError = (tab: string) => (DESIGN_TAB_FIELDS[tab] ?? []).some((key) => errors[key]);
  const watermarkType = form.watch("watermarkType");

  return (
    <Tabs defaultValue="layout" className="flex flex-col gap-4">
      <TabsList className="h-auto flex-wrap self-start">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
            {hasError(tab.id) && <span aria-label="erreur" className="ml-1.5 h-2 w-2 rounded-full bg-danger" />}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="layout" forceMount className="flex flex-col gap-4 data-[state=inactive]:hidden">
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField form={form} name="orientation" label="Orientation" options={ORIENTATIONS} labels={ORIENTATION_LABELS} />
          <SelectField form={form} name="pageFormat" label="Format" options={PAGE_FORMATS} labels={PAGE_FORMAT_LABELS} />
          <SelectField form={form} name="borderStyle" label="Bordure" options={BORDER_STYLES} labels={BORDER_LABELS} />
        </div>
        <ColorField form={form} name="borderColor" label="Couleur de la bordure" hint="Vide : couleur principale." />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField form={form} name="backgroundColor" label="Couleur de fond" />
          <TextField form={form} name="backgroundUrl" label="Image de fond (URL http/https)" placeholder="https://" />
        </div>
        <RangeField form={form} name="backgroundOpacity" label="Opacité de l'image de fond" min={0} max={1} step={0.05} />
        <TextField form={form} name="logoUrl" label="Logo (URL PNG ou JPEG)" placeholder="https://" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField form={form} name="logoPosition" label="Position du logo" options={LOGO_POSITIONS} labels={LOGO_POSITION_LABELS} />
          <SelectField form={form} name="logoSize" label="Taille du logo" options={LOGO_SIZES} labels={LOGO_SIZE_LABELS} />
        </div>
        <TextField form={form} name="badgeUrl" label="Cachet / insigne (URL PNG ou JPEG)" placeholder="https://" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField form={form} name="watermarkType" label="Filigrane" options={WATERMARK_TYPES} labels={WATERMARK_LABELS} />
          {watermarkType === "TEXT" && <TextField form={form} name="watermarkText" label="Texte du filigrane" placeholder="ORIGINAL" />}
        </div>
        {watermarkType !== "NONE" && <RangeField form={form} name="watermarkOpacity" label="Opacité du filigrane" min={0.02} max={0.3} step={0.01} />}
      </TabsContent>

      <TabsContent value="colors" forceMount className="flex flex-col gap-4 data-[state=inactive]:hidden">
        <ColorField form={form} name="primaryColor" label="Couleur principale" hint="Bandeau, nom de l'apprenant, bordure." />
        <ColorField form={form} name="secondaryColor" label="Couleur secondaire" hint="Date, numéro, mentions." />
        <ColorField form={form} name="textColor" label="Couleur du texte" />
        <SelectField form={form} name="fontFamily" label="Police" options={FONT_FAMILIES} labels={FONT_LABELS} />
      </TabsContent>

      <TabsContent value="content" forceMount className="flex flex-col gap-4 data-[state=inactive]:hidden">
        <SelectField form={form} name="language" label="Langue du certificat" options={LANGUAGES} labels={LANGUAGE_LABELS} />
        <TextField form={form} name="title" label="Titre" placeholder="Certificat de réussite" hint="Vide : titre selon la langue." />
        <Field
          id="bodyText"
          label="Texte d'attestation"
          error={msg(errors, "bodyText")}
          hint="Variables : {{learnerName}} {{courseTitle}} {{date}} {{score}} {{certificateNumber}}. Vide : texte par défaut."
        >
          <Textarea id="bodyText" rows={4} placeholder="{{learnerName}} a complété avec succès la formation {{courseTitle}} le {{date}}." {...form.register("bodyText")} />
        </Field>
        <TextField form={form} name="footerText" label="Pied de page" placeholder="Organisme de formation n° 123" />
      </TabsContent>

      <TabsContent value="signatures" forceMount className="flex flex-col gap-4 data-[state=inactive]:hidden">
        <p className="text-sm text-muted-foreground">Jusqu&apos;à deux signataires. Un signataire sans nom est ignoré.</p>
        {([1, 2] as const).map((n) => (
          <fieldset key={n} className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">Signataire {n}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField form={form} name={`signatory${n}Name`} label="Nom" placeholder="Awa Koné" />
              <TextField form={form} name={`signatory${n}Title`} label="Fonction" placeholder="Directrice pédagogique" />
            </div>
            <TextField form={form} name={`signatory${n}ImageUrl`} label="Image de signature (URL PNG ou JPEG)" placeholder="https://" />
          </fieldset>
        ))}
      </TabsContent>

      <TabsContent value="display" forceMount className="flex flex-col gap-2 data-[state=inactive]:hidden">
        <ToggleField form={form} name="showScore" label="Afficher le score" />
        <ToggleField form={form} name="showDate" label="Afficher la date de délivrance" />
        <ToggleField form={form} name="showNumber" label="Afficher le numéro du certificat" />
        <ToggleField form={form} name="showDuration" label="Afficher la durée de la formation" />
        <ToggleField form={form} name="showQrCode" label="Afficher le QR code de vérification" />
      </TabsContent>
    </Tabs>
  );
}
