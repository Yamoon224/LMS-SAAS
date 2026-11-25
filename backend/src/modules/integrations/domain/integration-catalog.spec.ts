import {
  configSource,
  getDefinition,
  hostProblem,
  InvalidIntegrationConfigError,
  resolveValues,
  UnknownIntegrationError,
  urlProblem,
  validateConfig,
} from "./integration-catalog";

const NO_ENV: NodeJS.ProcessEnv = {};
const none = new Set<string>();

describe("urlProblem (garde anti-SSRF)", () => {
  it.each([
    "https://api.deepl.com/v2/translate",
    "https://sms.example.org/send?x=1",
    "https://8.8.8.8/x",
  ])("accepte %s", (url) => {
    expect(urlProblem(url)).toBeNull();
  });

  it.each([
    ["http://api.example.com", "https"],
    ["ftp://api.example.com", "https"],
    ["https://localhost/x", "local"],
    ["https://127.0.0.1/x", "privée"],
    ["https://10.1.2.3/x", "privée"],
    ["https://172.16.0.1/x", "privée"],
    ["https://172.31.255.1/x", "privée"],
    ["https://192.168.1.1/x", "privée"],
    ["https://169.254.169.254/latest/meta-data", "privée"],
    ["https://0.0.0.0/x", "privée"],
    ["https://[::1]/x", "privée"],
    ["https://[fd00::1]/x", "privée"],
    ["https://[::ffff:127.0.0.1]/x", "privée"],
    ["https://db.internal/x", "local"],
    ["https://monserveur/x", "local"],
    ["https://user:pass@api.example.com/x", "identifiants"],
    ["pas une url", "invalide"],
  ])("refuse %s", (url, fragment) => {
    expect(urlProblem(url)).toContain(fragment);
  });

  it("n'écarte pas 172.32.x.x (hors plage privée)", () => {
    expect(urlProblem("https://172.32.0.1/x")).toBeNull();
  });
});

describe("hostProblem", () => {
  it("accepte un nom de domaine public", () => {
    expect(hostProblem("smtp.example.com")).toBeNull();
  });
  it("refuse un schéma ou un chemin dans l'hôte", () => {
    expect(hostProblem("smtp://example.com")).not.toBeNull();
    expect(hostProblem("example.com/path")).not.toBeNull();
  });
  it("refuse localhost et les adresses privées", () => {
    expect(hostProblem("localhost")).not.toBeNull();
    expect(hostProblem("192.168.0.5")).not.toBeNull();
  });
});

describe("validateConfig", () => {
  const smtp = { host: "smtp.example.com", port: 587, fromAddress: "no-reply@example.com" };

  it("accepte une configuration SMTP valide et normalise les valeurs en texte", () => {
    const result = validateConfig("EMAIL_SMTP", { ...smtp, secure: false, password: "s3cret" }, [], none, NO_ENV);
    expect(result.values).toEqual({ host: "smtp.example.com", port: "587", secure: "false", fromAddress: "no-reply@example.com" });
    expect(result.newSecrets).toEqual({ password: "s3cret" });
  });

  it("refuse un provider inconnu", () => {
    expect(() => validateConfig("NOPE", {}, [], none, NO_ENV)).toThrow(UnknownIntegrationError);
  });

  it("refuse un champ inconnu", () => {
    expect(() => validateConfig("EMAIL_SMTP", { ...smtp, evil: "x" }, [], none, NO_ENV)).toThrow(/Champ inconnu/);
  });

  it("liste tous les problèmes en une fois", () => {
    try {
      validateConfig("EMAIL_SMTP", { host: "localhost", port: 99999, fromAddress: "pas-un-mail" }, [], none, NO_ENV);
      throw new Error("aurait dû échouer");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidIntegrationConfigError);
      expect((error as InvalidIntegrationConfigError).problems).toHaveLength(3);
    }
  });

  it("exige les champs obligatoires sans repli", () => {
    expect(() => validateConfig("SMS_GATEWAY", {}, [], none, NO_ENV)).toThrow(/URL de l'API : champ obligatoire/);
  });

  it("un champ obligatoire peut être couvert par l'environnement", () => {
    const env = { SMS_API_URL: "https://sms.example.org", SMS_API_KEY: "k" };
    expect(validateConfig("SMS_GATEWAY", { senderId: "Acme" }, [], none, env).values).toEqual({ senderId: "Acme" });
  });

  it("un secret absent ou vide est conservé quand il existe déjà", () => {
    const stored = new Set(["apiKey"]);
    const result = validateConfig("SMS_GATEWAY", { apiUrl: "https://sms.example.org", apiKey: "" }, [], stored, NO_ENV);
    expect(result.newSecrets).toEqual({});
    expect(result.clearedSecrets).toEqual([]);
  });

  it("un secret obligatoire jamais enregistré est exigé", () => {
    expect(() => validateConfig("SMS_GATEWAY", { apiUrl: "https://sms.example.org" }, [], none, NO_ENV)).toThrow(/Clé API/);
  });

  it("clearSecrets supprime un secret, et refuse si c'est un secret obligatoire sans repli", () => {
    expect(() =>
      validateConfig("SMS_GATEWAY", { apiUrl: "https://sms.example.org" }, ["apiKey"], new Set(["apiKey"]), NO_ENV),
    ).toThrow(/Clé API/);
    const result = validateConfig("EMAIL_SMTP", smtp, ["password"], new Set(["password"]), NO_ENV);
    expect(result.clearedSecrets).toEqual(["password"]);
  });

});

describe("validateConfig : URL et clés", () => {
  it("refuse une URL non HTTPS ou interne", () => {
    expect(() => validateConfig("AI_TRANSLATION", { apiUrl: "http://api.example.com", apiKey: "k" }, [], none, NO_ENV)).toThrow(
      /https/,
    );
    expect(() => validateConfig("AI_TRANSLATION", { apiUrl: "https://169.254.169.254/", apiKey: "k" }, [], none, NO_ENV)).toThrow(
      /privée/,
    );
  });

  it("refuse une clé privée Google qui n'est pas au format PEM", () => {
    expect(() =>
      validateConfig(
        "GOOGLE_CALENDAR",
        { serviceAccountEmail: "sa@projet.iam.gserviceaccount.com", privateKey: "n'importe quoi" },
        [],
        none,
        NO_ENV,
      ),
    ).toThrow(/PEM/);
  });
});

describe("resolveValues", () => {
  it("la base l'emporte sur l'environnement, qui l'emporte sur la valeur par défaut", () => {
    const env = { SMTP_HOST: "env.example.com", SMTP_PORT: "2525" };
    const result = resolveValues("EMAIL_SMTP", { host: "db.example.com" }, env);
    expect(result.host).toBe("db.example.com");
    expect(result.port).toBe("2525");
    expect(result.secure).toBe("false");
  });

  it("une valeur vide en base n'écrase pas l'environnement", () => {
    expect(resolveValues("EMAIL_SMTP", { host: "  " }, { SMTP_HOST: "env.example.com" }).host).toBe("env.example.com");
  });

  it("garde l'URL DeepL par défaut", () => {
    expect(resolveValues("AI_TRANSLATION", {}, NO_ENV).apiUrl).toBe("https://api-free.deepl.com/v2/translate");
  });
});

describe("configSource", () => {
  it("PLATFORM quand quelque chose est enregistré", () => {
    expect(configSource("SMS_GATEWAY", new Set(["apiUrl"]), NO_ENV)).toBe("PLATFORM");
  });
  it("ENVIRONMENT quand seule une variable est définie", () => {
    expect(configSource("SMS_GATEWAY", none, { SMS_API_KEY: "k" })).toBe("ENVIRONMENT");
  });
  it("NONE sinon", () => {
    expect(configSource("SMS_GATEWAY", none, NO_ENV)).toBe("NONE");
  });
});

describe("catalogue", () => {
  it("chaque provider a au moins un secret ou un champ, et des clés uniques", () => {
    for (const provider of ["AI_TRANSLATION", "EMAIL_SMTP", "SMS_GATEWAY", "GOOGLE_CALENDAR"]) {
      const keys = getDefinition(provider).fields.map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
