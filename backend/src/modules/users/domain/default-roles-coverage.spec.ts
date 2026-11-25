import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PLATFORM_SUPER_ADMIN_PERMISSION_CODES } from "./default-platform-roles";
import {
  DEFAULT_TENANT_ROLES,
  LEARNER_PERMISSION_CODES,
  TENANT_INSTRUCTOR_ROLE_NAME,
  TENANT_LEARNER_ROLE_NAME,
  TENANT_MANAGER_ROLE_NAME,
  TENANT_OWNER_ROLE_NAME,
} from "./default-tenant-roles";

const MODULES_DIR = join(__dirname, "..", "..");

function collectControllers(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectControllers(full, out);
    else if (entry.endsWith(".controller.ts")) out.push(full);
  }
  return out;
}

/** Codes exigés par contrôleur, regroupés par zone de route (admin / business / public). */
function requiredCodesByArea(): Record<"admin" | "business" | "public", Set<string>> {
  const result = { admin: new Set<string>(), business: new Set<string>(), public: new Set<string>() };
  for (const file of collectControllers(MODULES_DIR)) {
    const source = readFileSync(file, "utf8");
    const area = /@Controller\("(admin|business|public)\b/.exec(source)?.[1] as keyof typeof result | undefined;
    if (!area) continue;
    for (const match of source.matchAll(/@RequirePermissions\(([^)]*)\)/g)) {
      for (const code of (match[1] ?? "").matchAll(/"([^"]+)"/g)) {
        if (code[1]) result[area].add(code[1]);
      }
    }
  }
  return result;
}

function codesOf(roleName: string): Set<string> {
  const role = DEFAULT_TENANT_ROLES.find((definition) => definition.name === roleName);
  if (!role) throw new Error(`Rôle par défaut introuvable: ${roleName}`);
  return new Set(role.permissionCodes);
}

describe("couverture des permissions par les rôles par défaut", () => {
  const required = requiredCodesByArea();

  it("le Super Administrateur plateforme couvre tous les codes des contrôleurs admin/*", () => {
    const granted = new Set(PLATFORM_SUPER_ADMIN_PERMISSION_CODES);
    const missing = [...required.admin].filter((code) => !granted.has(code));
    expect(missing).toEqual([]);
  });

  it("le Propriétaire couvre tous les codes des contrôleurs business/*", () => {
    const granted = codesOf(TENANT_OWNER_ROLE_NAME);
    const missing = [...required.business].filter((code) => !granted.has(code));
    expect(missing).toEqual([]);
  });

  it("l'Apprenant porte exactement les codes learner.* des contrôleurs public/*", () => {
    const publicLearnerCodes = [...required.public].filter((code) => code.startsWith("learner."));
    expect([...codesOf(TENANT_LEARNER_ROLE_NAME)].sort()).toEqual([...publicLearnerCodes].sort());
    expect([...LEARNER_PERMISSION_CODES].sort()).toEqual([...publicLearnerCodes].sort());
  });

  it("aucun code d'un contrôleur public n'est hors rôle Apprenant", () => {
    const granted = codesOf(TENANT_LEARNER_ROLE_NAME);
    expect([...required.public].filter((code) => !granted.has(code))).toEqual([]);
  });

  it("le Gestionnaire n'a ni gestion des utilisateurs, ni abonnement, ni demande de reversement", () => {
    const granted = codesOf(TENANT_MANAGER_ROLE_NAME);
    for (const forbidden of ["business-users.manage", "subscriptions.manage", "wallet.request-payout"]) {
      expect(granted.has(forbidden)).toBe(false);
    }
    for (const expected of ["analytics.view", "wallet.view", "learners.manage", "live-sessions.manage"]) {
      expect(granted.has(expected)).toBe(true);
    }
  });

  it("le Formateur crée du contenu et consulte les inscrits sans pouvoir les gérer", () => {
    const granted = codesOf(TENANT_INSTRUCTOR_ROLE_NAME);
    expect(granted.has("courses.manage")).toBe(true);
    expect(granted.has("live-sessions.manage")).toBe(true);
    expect(granted.has("learners.view")).toBe(true);
    expect(granted.has("learners.manage")).toBe(false);
    expect(granted.has("business-users.manage")).toBe(false);
  });
});
