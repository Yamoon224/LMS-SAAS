import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import "./globals.css";

import { Providers } from "./providers";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: {
    default: "Back-office Entreprise — SaaS LMS",
    template: "%s — Entreprise SaaS LMS",
  },
  description: "Back-office Entreprise : gestion des formations, apprenants et équipes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Langues RTL supportées : si la locale active en fait partie, dir="rtl".
const RTL_LOCALES = ["ar"];
const defaultLocale = "fr";

// Applique le thème mémorisé avant l'hydratation (évite un flash clair → sombre).
const THEME_SCRIPT = `try{var t=localStorage.getItem("business-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const dir = RTL_LOCALES.includes(defaultLocale) ? "rtl" : "ltr";

  return (
    <html lang={defaultLocale} dir={dir} className={`${plexSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
