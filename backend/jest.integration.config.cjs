/** Integration tests: REST endpoints with guards, repositories, Testcontainers (section 13.5). */
module.exports = {
  displayName: "backend:integration",
  rootDir: ".",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: ".*\\.integration-spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  // Voir jest.config.cjs: sanitize-html embarque une chaîne de dépendances
  // DOM publiées en ESM pur, qui doivent être transformées plutôt qu'ignorées.
  transformIgnorePatterns: [],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup-integration.ts"],
  testTimeout: 60000,
};
