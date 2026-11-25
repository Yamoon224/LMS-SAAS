module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "backend",
        "admin",
        "business",
        "learning",
        "ui",
        "api-client",
        "i18n",
        "config",
        "deps",
        "ci",
        "docs",
      ],
    ],
  },
};
