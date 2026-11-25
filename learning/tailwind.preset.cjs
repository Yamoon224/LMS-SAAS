/**
 * Shared Tailwind preset — design tokens for the SaaS LMS design system.
 * Cahier des charges section 14.2: 8px spacing grid, limited type scale,
 * neutral palette + tenant brand color injected via CSS variables.
 */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand, #0F172A)",
          foreground: "var(--color-brand-foreground, #FFFFFF)",
        },
        surface: {
          DEFAULT: "var(--color-surface, #FFFFFF)",
          muted: "var(--color-surface-muted, #F8FAFC)",
        },
        border: "var(--color-border, #E2E8F0)",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
        info: "#2563EB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "Noto Sans Arabic", "sans-serif"],
        chinese: ["var(--font-chinese)", "Noto Sans SC", "sans-serif"],
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.25rem",
        xl: "1.5rem",
        "2xl": "2rem",
      },
      spacing: {
        px: "1px",
        0: "0",
        1: "0.5rem",
        2: "1rem",
        3: "1.5rem",
        4: "2rem",
        5: "2.5rem",
        6: "3rem",
        8: "4rem",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "200ms",
        slow: "250ms",
      },
    },
  },
  plugins: [],
};
