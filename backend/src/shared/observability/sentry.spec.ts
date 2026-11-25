import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { shouldReportToSentry } from "../filters/sentry-exception.filter";

import { initSentry, scrub } from "./sentry";

describe("scrub", () => {
  it("masque mots de passe, jetons, e-mails et en-têtes d'autorisation", () => {
    const out = scrub({
      password: "x",
      nested: { accessToken: "abc", note: "contact jean@ex.com", ok: 1 },
      list: [{ authorization: "Bearer zzz" }, "Bearer abc.def"],
    });
    expect(out.password).toBe("[Filtered]");
    expect(out.nested.accessToken).toBe("[Filtered]");
    expect(out.nested.note).toBe("contact [Filtered]");
    expect(out.nested.ok).toBe(1);
    expect(out.list[0]).toEqual({ authorization: "[Filtered]" });
    expect(out.list[1]).toBe("Bearer [Filtered]");
  });
});

describe("shouldReportToSentry", () => {
  it("ignore les erreurs de domaine et les 4xx, remonte les 5xx et les erreurs inattendues", () => {
    expect(shouldReportToSentry(new NotFoundDomainError("introuvable"))).toBe(false);
    expect(shouldReportToSentry(new BadRequestException())).toBe(false);
    expect(shouldReportToSentry(new InternalServerErrorException())).toBe(true);
    expect(shouldReportToSentry(new Error("boom"))).toBe(true);
  });
});

describe("initSentry", () => {
  it("reste désactivé sans SENTRY_DSN", () => {
    expect(initSentry({ SENTRY_DSN: "" } as NodeJS.ProcessEnv)).toBe(false);
  });
});
