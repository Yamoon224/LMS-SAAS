import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, Noto_Sans_Arabic, Noto_Sans_SC, Space_Grotesk } from "next/font/google";

import "./globals.css";

import { Providers } from "./providers";

import { primaryColorCss } from "@/features/tenant/branding";
import { getTenantProfile } from "@/features/tenant/tenant.server";
import { I18nProvider } from "@/lib/i18n/client";
import { textDirection } from "@/lib/i18n/locales";
import { getCopy, getLocale } from "@/lib/i18n/server";

const inter = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

/**
 * Polices des alphabets non latins : déclarées ici mais APPLIQUÉES (classe `variable` sur <html>) seulement pour
 * leur langue, afin que le CSS @font-face n'alourdisse pas les autres langues. `preload: false` : aucun
 * `<link rel="preload">` ; le navigateur ne télécharge que les tranches `unicode-range` réellement utilisées.
 * Repli système défini dans globals.css.
 */
const notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", preload: false });
const notoChinese = Noto_Sans_SC({ subsets: ["latin"], variable: "--font-chinese", display: "swap", preload: false });

/** Cyrillique et latin étendu (turc : ğ ş İ) pour Inter : tranches supplémentaires, seulement pour `ru` et `tr`. */
const interExtended = Inter({ subsets: ["cyrillic", "latin-ext"], variable: "--font-sans-ext", display: "swap", preload: false });

const SCRIPT_FONT_CLASS: Partial<Record<string, string>> = {
  ar: notoArabic.variable,
  zh: notoChinese.variable,
  ru: interExtended.variable,
  tr: interExtended.variable,
};

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: { default: copy.meta.siteTitle, template: `%s · ${copy.meta.siteTitle}` },
    description: copy.meta.siteDescription,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [tenant, locale] = await Promise.all([getTenantProfile(), getLocale()]);
  const brandCss = primaryColorCss(tenant.primaryColor);
  return (
    <html lang={locale} dir={textDirection(locale)} className={`${inter.variable} ${spaceGrotesk.variable} ${SCRIPT_FONT_CLASS[locale] ?? ""}`.trim()}>
      <head>{brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}</head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <I18nProvider locale={locale}>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
