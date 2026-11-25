import { renderTemplate } from "./notification-template";
import {
  allowedVariables,
  extractVariables,
  interpolate,
  isOverridableLocale,
  knownTemplateKeys,
  placeholderPayload,
  requiredVariables,
  TemplateOverrideInvalidError,
  TemplateUnknownError,
  validateOverride,
} from "./template-overrides";

describe("extractVariables / interpolate", () => {
  it("repère les variables sans doublon, espaces tolérés", () => {
    expect(extractVariables("Bonjour {{firstName}}, {{ resetUrl }} {{firstName}}")).toEqual(["firstName", "resetUrl"]);
  });

  it("remplace les variables et vide celles qui manquent", () => {
    expect(interpolate("Salut {{firstName}} ({{amount}}){{absente}}", { firstName: "Awa", amount: 25000 })).toBe(
      "Salut Awa (25000)",
    );
  });

  it("n'évalue jamais de code et ne réinterprète pas une valeur contenant des accolades", () => {
    expect(interpolate("{{firstName}}", { firstName: "{{amount}}" })).toBe("{{amount}}");
    expect(interpolate("${1+1} {{ firstName }}", { firstName: "x" })).toBe("${1+1} x");
  });
});

describe("validateOverride", () => {
  it("accepte une surcharge valide", () => {
    expect(() =>
      validateOverride("user.password-reset", "Nouveau mot de passe", "Bonjour {{firstName}}, lien : {{resetUrl}}"),
    ).not.toThrow();
  });

  it("refuse un modèle inconnu", () => {
    expect(() => validateOverride("nimporte.quoi", "s", "b")).toThrow(TemplateUnknownError);
  });

  it("refuse un sujet ou un contenu vide", () => {
    expect(() => validateOverride("subscription.expired", "  ", "b")).toThrow(TemplateOverrideInvalidError);
    expect(() => validateOverride("subscription.expired", "s", "")).toThrow(TemplateOverrideInvalidError);
  });

  it.each(["Ligne 1\nBcc: pirate@example.com", "Ligne 1\r\nX: y"])(
    "refuse un sujet sur plusieurs lignes (injection d'en-têtes) : %j",
    (subject) => {
      expect(() => validateOverride("subscription.expired", subject, "corps")).toThrow(TemplateOverrideInvalidError);
    },
  );

  it("refuse une variable inconnue du modèle et la nomme", () => {
    expect(() => validateOverride("payment.failed", "Échec", "{{amount}} {{motDePasse}}")).toThrow(/motDePasse/);
  });

  it("refuse un contenu sans la variable vitale", () => {
    expect(() => validateOverride("user.invited", "Bienvenue", "Bonjour {{firstName}}")).toThrow(/activationUrl/);
    expect(() => validateOverride("live-session.scheduled", "Live", "Session {{sessionTitle}}")).toThrow(/meetLink/);
  });

  it("n'exige pas la variable vitale dans le sujet seul", () => {
    expect(() => validateOverride("user.invited", "Votre accès {{firstName}}", "Cliquez : {{activationUrl}}")).not.toThrow();
  });

  it("refuse un texte démesuré", () => {
    expect(() => validateOverride("subscription.expired", "s".repeat(201), "b")).toThrow(TemplateOverrideInvalidError);
    expect(() => validateOverride("subscription.expired", "s", "b".repeat(10_001))).toThrow(TemplateOverrideInvalidError);
  });
});

describe("cohérence avec les gabarits d'origine", () => {
  it("chaque gabarit d'origine est déclaré surchargeable, et inversement", () => {
    for (const key of knownTemplateKeys()) {
      expect(() => renderTemplate(key, "fr", placeholderPayload(key))).not.toThrow();
    }
  });

  it("le texte d'origine rendu avec les marqueurs ne contient que des variables déclarées", () => {
    for (const key of knownTemplateKeys()) {
      const allowed = new Set(allowedVariables(key));
      for (const locale of ["fr", "en"]) {
        const { subject, body } = renderTemplate(key, locale, placeholderPayload(key));
        for (const name of [...extractVariables(subject), ...extractVariables(body)]) {
          expect(allowed.has(name)).toBe(true);
        }
      }
    }
  });

  it("le texte d'origine respecte lui-même les règles de validation", () => {
    for (const key of knownTemplateKeys()) {
      for (const locale of ["fr", "en"]) {
        const { subject, body } = renderTemplate(key, locale, placeholderPayload(key));
        expect(() => validateOverride(key, subject, body)).not.toThrow();
      }
    }
  });
});

describe("isOverridableLocale", () => {
  it("n'accepte que les langues ayant un gabarit d'origine", () => {
    expect(isOverridableLocale("fr")).toBe(true);
    expect(isOverridableLocale("en")).toBe(true);
    expect(isOverridableLocale("ar")).toBe(false);
  });
});

describe("template-overrides modèle inconnu", () => {
  it("n'autorise que firstName pour une clé inconnue", () => {
    expect(allowedVariables("inconnu.xyz")).toEqual(["firstName"]);
  });

  it("n'exige aucune variable pour une clé inconnue", () => {
    expect(requiredVariables("inconnu.xyz")).toEqual([]);
  });
});
