// Configuration ESLint autonome de backend (aucune config partagée entre composants).
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const importPlugin = require("eslint-plugin-import");
const prettierConfig = require("eslint-config-prettier");

const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "complexity": ["warn", 15],
      "max-lines-per-function": [
        "warn",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // consistent-type-imports already enforces the `import type` split;
      // no-duplicate-imports would otherwise flag the resulting two
      // statements from the same module as duplicates.
      "no-duplicate-imports": "off",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  prettierConfig,
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.cjs",
    ],
  },
];


module.exports = [
  ...baseConfig,
  {
    rules: {
      // Nest decorators rely on parameter properties and empty constructors.
      "@typescript-eslint/no-useless-constructor": "off",
      "@typescript-eslint/no-extraneous-class": "off",
      // Dependency injection commonly needs non-null assertions on DTOs validated upstream.
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
];
