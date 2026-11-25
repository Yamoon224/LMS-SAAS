/**
 * lint-staged (appelé par .husky/pre-commit) : ESLint --fix PUIS Prettier sur les fichiers indexés.
 *
 * Chaque composant (backend, admin, business, learning) a sa propre configuration ESLint (flat config) : ESLint doit
 * donc être lancé DEPUIS le dossier du composant, avec des chemins relatifs à celui-ci. Prettier, lui, tourne depuis
 * la racine (.prettierrc.json) sur tous les fichiers. Prettier passe en dernier pour avoir le dernier mot sur la mise
 * en forme (eslint-config-prettier désactive les règles de style d'ESLint : pas de conflit).
 */
const path = require("node:path");

const COMPONENTS = ["backend", "admin", "business", "learning"];

const quote = (value) => JSON.stringify(value);
const posix = (value) => value.split(path.sep).join("/");

/** Fichiers situés sous `dir`, relatifs à `dir` (séparateurs POSIX). */
function relativeTo(dir, files) {
  return files
    .map((file) => path.relative(dir, file))
    .filter((relative) => relative && !relative.startsWith("..") && !path.isAbsolute(relative))
    .map(posix);
}

module.exports = {
  "*.{ts,tsx,js,jsx,mjs,cjs}": (files) => {
    const root = process.cwd();
    const commands = [];
    for (const component of COMPONENTS) {
      const own = relativeTo(path.join(root, component), files);
      if (own.length === 0) continue;
      // --no-warn-ignored : un fichier exclu par la configuration du composant n'est pas une erreur.
      commands.push(
        `pnpm --dir ${component} exec eslint --fix --no-warn-ignored ${own.map(quote).join(" ")}`,
      );
    }
    commands.push(
      `prettier --write ${files.map((file) => quote(posix(path.relative(root, file)))).join(" ")}`,
    );
    return commands;
  },
  "*.{json,md,css,yml,yaml}": ["prettier --write"],
};
