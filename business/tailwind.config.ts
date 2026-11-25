import { createRequire } from "node:module";

import type { Config } from "tailwindcss";

// `require` n'existe pas quand Node charge ce fichier .ts comme module ES natif.
const nodeRequire = createRequire(import.meta.url);

/**
 * Config Tailwind de l'app business. Étend le préset partagé
 * (tailwind.preset.cjs) SANS le modifier (admin/learning non affectés) :
 * - couleurs en canaux RGB (`rgb(var(--x) / <alpha-value>)`) pour que les modificateurs
 *   d'opacité (`bg-brand/10`, `hover:bg-accent/60`) fonctionnent et que le mode sombre
 *   se pilote par variables CSS (voir globals.css) ;
 * - échelle d'espacement Tailwind standard (le préset décale 1..8 en pas de 8px, ce qui
 *   rendait `p-4` = 32px et `h-4` = 32px) — on la restaure localement, grille de 4px ;
 * - un accent unique (`brand`, indigo) + sémantiques success / warning / danger / info.
 */
const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  presets: [nodeRequire("./tailwind.preset.cjs")],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: channel("--brand"),
          foreground: channel("--brand-foreground"),
        },
        foreground: channel("--foreground"),
        surface: {
          DEFAULT: channel("--surface"),
          muted: channel("--surface-muted"),
        },
        border: channel("--border"),
        muted: {
          DEFAULT: channel("--surface-muted"),
          foreground: channel("--muted-foreground"),
        },
        accent: {
          DEFAULT: channel("--accent"),
          foreground: channel("--foreground"),
        },
        ring: channel("--ring"),
        success: channel("--success"),
        warning: channel("--warning"),
        danger: channel("--danger"),
        info: channel("--info"),
      },
      spacing: {
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        8: "2rem",
      },
      fontSize: {
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--card-shadow)",
        "card-hover": "var(--card-shadow-hover)",
        pop: "0 10px 30px -10px rgb(15 23 42 / 0.25), 0 4px 10px -4px rgb(15 23 42 / 0.12)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in-left": "slide-in-left 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right": "slide-in-right 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pop-in": "pop-in 150ms ease-out",
      },
    },
  },
};

export default config;
