/**
 * Architecture boundary rules — cahier des charges section 13.2.
 * Run with: pnpm arch:check
 */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment:
        "Le domaine ne doit dépendre ni de NestJS, ni de l'ORM, ni d'un SDK externe : il ne contient que la logique métier.",
      severity: "error",
      from: { path: "^backend/src/modules/[^/]+/domain" },
      to: {
        path: "node_modules/(@nestjs|@prisma|prisma|aws-sdk|googleapis|ioredis|bullmq)",
      },
    },
    {
      name: "domain-no-infrastructure",
      comment: "Le domaine ne doit jamais importer l'infrastructure de son propre module.",
      severity: "error",
      from: { path: "^backend/src/modules/([^/]+)/domain" },
      to: { path: "^backend/src/modules/$1/infrastructure" },
    },
    {
      name: "domain-no-application",
      comment: "Le domaine ne doit jamais dépendre de la couche application (sens unique).",
      severity: "error",
      from: { path: "^backend/src/modules/([^/]+)/domain" },
      to: { path: "^backend/src/modules/$1/application" },
    },
    {
      name: "domain-no-presentation",
      comment: "Le domaine ne doit jamais dépendre de la couche presentation.",
      severity: "error",
      from: { path: "^backend/src/modules/([^/]+)/domain" },
      to: { path: "^backend/src/modules/$1/presentation" },
    },
    {
      name: "application-no-presentation",
      comment: "L'application ne doit jamais dépendre de la présentation (sens unique).",
      severity: "error",
      from: { path: "^backend/src/modules/([^/]+)/application" },
      to: { path: "^backend/src/modules/$1/presentation" },
    },
    {
      name: "no-cross-module-internals",
      comment:
        "Communication entre modules uniquement via la façade publique (*.facade.ts) ou des événements de domaine. Import direct des fichiers internes d'un autre module interdit.",
      severity: "error",
      from: { path: "^backend/src/modules/([^/]+)/" },
      to: {
        path: "^backend/src/modules/(?!$1)([^/]+)/(domain|application|infrastructure|presentation)",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: require("node:path").join(__dirname, "backend/tsconfig.json") },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
