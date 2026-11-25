/** Unit tests only: domain + application layers, ports mocked (section 13.5). */
module.exports = {
  displayName: "backend:unit",
  rootDir: ".",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: ["/node_modules/", "\\.integration-spec\\.ts$"],
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  // sanitize-html embarque toute une chaîne de dépendances DOM
  // (htmlparser2, domhandler, domutils, domelementtype, dom-serializer,
  // entities...) publiées en ESM pur. Plutôt que lister chaque paquet un par
  // un (fragile, casse à chaque mise à jour transitive), on transforme tout
  // node_modules et on laisse ts-jest gérer le mélange CJS/ESM.
  transformIgnorePatterns: [],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
  },
  collectCoverageFrom: [
    "src/modules/**/domain/**/*.ts",
    "src/modules/**/application/**/*.ts",
    "!**/*.module.ts",
    "!**/*.facade.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
