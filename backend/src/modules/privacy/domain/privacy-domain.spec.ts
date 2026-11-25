import {
  ANONYMIZED_EMAIL_DOMAIN,
  anonymizedIdentity,
  DELETED_ACCOUNT_NAME,
  isAnonymizedEmail,
} from "./anonymized-identity";
import { isRetentionPurgeEnabled, monthsBefore } from "./privacy-policy";

describe("anonymizedIdentity", () => {
  const userId = "7b0c2f4e-1111-4a8c-9d3e-aaaaaaaaaaaa";

  it("replaces name, e-mail and phone and keeps nothing of the original data", () => {
    const identity = anonymizedIdentity(userId);
    expect(identity.phone).toBeNull();
    expect(`${identity.firstName} ${identity.lastName}`).toBe(DELETED_ACCOUNT_NAME);
    expect(identity.email).toBe(`deleted-${userId}@${ANONYMIZED_EMAIL_DOMAIN}`);
  });

  it("depends only on the internal id: it is the same function of the id whatever the old data was", () => {
    expect(anonymizedIdentity(userId)).toEqual(anonymizedIdentity(userId));
    expect(anonymizedIdentity(userId).email).not.toBe(anonymizedIdentity("other-id").email);
  });

  it("produces an address that can never collide with a real one and is recognised as anonymized", () => {
    const email = anonymizedIdentity(userId).email;
    expect(isAnonymizedEmail(email)).toBe(true);
    expect(isAnonymizedEmail(email.toUpperCase())).toBe(true);
    expect(isAnonymizedEmail("aya@example.com")).toBe(false);
    expect(isAnonymizedEmail("aya@anonymized.invalid.example.com")).toBe(false);
  });
});

describe("politique de conservation", () => {
  it("computes the cut-off date in months, UTC", () => {
    const now = new Date("2026-11-18T10:00:00Z");
    expect(monthsBefore(now, 12).toISOString()).toBe("2025-11-18T10:00:00.000Z");
    expect(monthsBefore(now, 36).toISOString()).toBe("2023-11-18T10:00:00.000Z");
  });

  it("clamps to the end of a shorter month", () => {
    expect(monthsBefore(new Date("2026-03-31T00:00:00Z"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(monthsBefore(new Date("2024-03-31T00:00:00Z"), 1).toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  it("is enabled unless RETENTION_PURGE_ENABLED is exactly false", () => {
    expect(isRetentionPurgeEnabled({})).toBe(true);
    expect(isRetentionPurgeEnabled({ RETENTION_PURGE_ENABLED: "true" })).toBe(true);
    expect(isRetentionPurgeEnabled({ RETENTION_PURGE_ENABLED: "false" })).toBe(false);
  });
});
