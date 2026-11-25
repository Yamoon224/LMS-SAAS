import type { Config } from "tailwindcss";

/**
 * Jetons visuels de l'app learning. Le preset partagé (tailwind.preset.cjs local) redéfinit
 * l'échelle d'espacement (1 = 0.5rem…) ; on rétablit ici l'échelle Tailwind
 * standard (1 = 0.25rem) pour des interfaces mobiles denses, sans toucher au preset.
 * Les couleurs d'accent passent par des variables CSS (canaux RGB) pour que la
 * couleur primaire du tenant puisse les surcharger à l'exécution.
 */
const config: Config = {
  presets: [require("./tailwind.preset.cjs")],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        px: "1px",
        0: "0",
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        8: "2rem",
      },
      colors: {
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        ink: "rgb(var(--ink) / <alpha-value>)",
        subtle: "rgb(var(--subtle) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--card-shadow)",
        lift: "var(--card-shadow-hover)",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "toast-in": "toast-in 180ms ease-out" },
    },
  },
};

export default config;
