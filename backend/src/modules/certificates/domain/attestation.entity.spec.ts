import { InvalidStateTransitionError } from "@shared/errors";

import { buildAttestationNumber, isAttestationNumber } from "./attestation-number";
import { AttestationStatus } from "./attestation-status";
import { Attestation, isAttestationEligibleCourseType, type AttestationProps } from "./attestation.entity";

function build(overrides: Partial<AttestationProps> = {}): Attestation {
  return Attestation.fromPersistence({
    id: "att-1",
    enrollmentId: "enr-1",
    number: "ATT-202601-ABCD1234",
    status: AttestationStatus.VALID,
    learnerNameSnapshot: "Aïcha Koné",
    courseTitleSnapshot: "Initiation à Excel",
    progressPercent: 100,
    durationMinutes: 120,
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: new Date("2026-01-15T00:00:00Z"),
    pdfUrl: "tenants/t1/certificates/ATT-202601-ABCD1234.pdf",
    qrVerificationUrl: "https://acme.local/verify-certificate/ATT-202601-ABCD1234",
    revocationReason: null,
    issuedAt: new Date("2026-01-15T00:00:00Z"),
    revokedAt: null,
    ...overrides,
  });
}

describe("buildAttestationNumber", () => {
  it("construit ATT-AAAAMM-SUFFIXE en majuscules", () => {
    expect(buildAttestationNumber(new Date("2026-03-15T10:00:00Z"), "abcd1234")).toBe("ATT-202603-ABCD1234");
    expect(buildAttestationNumber(new Date("2026-09-05T00:00:00Z"), "a1")).toBe("ATT-202609-A1");
  });

  it("reconnaît un numéro d'attestation et pas un numéro de certificat", () => {
    expect(isAttestationNumber("ATT-202603-ABCD1234")).toBe(true);
    expect(isAttestationNumber("att-202603-abcd1234")).toBe(true);
    expect(isAttestationNumber("CERT-202603-ABCD1234")).toBe(false);
  });
});

describe("Attestation", () => {
  it("est vérifiable tant qu'elle est VALIDE", () => {
    expect(build().isVerifiable()).toBe(true);
  });

  it("se révoque avec un motif, puis n'est plus vérifiable", () => {
    const attestation = build();
    attestation.revoke("  Délivrée par erreur  ");
    expect(attestation.status).toBe(AttestationStatus.REVOKED);
    expect(attestation.revocationReason).toBe("Délivrée par erreur");
    expect(attestation.toSnapshot().revokedAt).toBeInstanceOf(Date);
    expect(attestation.isVerifiable()).toBe(false);
  });

  it("refuse une révocation sans motif", () => {
    expect(() => build().revoke("   ")).toThrow(InvalidStateTransitionError);
  });

  it("refuse de révoquer deux fois", () => {
    const attestation = build({ status: AttestationStatus.REVOKED });
    expect(() => attestation.revoke("x")).toThrow(InvalidStateTransitionError);
  });

  it("conserve les valeurs figées à la délivrance", () => {
    const attestation = build();
    expect(attestation.learnerNameSnapshot).toBe("Aïcha Koné");
    expect(attestation.courseTitleSnapshot).toBe("Initiation à Excel");
  });

  it("expose les autres propriétés de la délivrance", () => {
    const attestation = build();
    expect(attestation.id).toBe("att-1");
    expect(attestation.enrollmentId).toBe("enr-1");
    expect(attestation.number).toBe("ATT-202601-ABCD1234");
    expect(attestation.progressPercent).toBe(100);
    expect(attestation.durationMinutes).toBe(120);
    expect(attestation.startedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(attestation.endedAt).toEqual(new Date("2026-01-15T00:00:00Z"));
    expect(attestation.pdfUrl).toBe("tenants/t1/certificates/ATT-202601-ABCD1234.pdf");
    expect(attestation.qrVerificationUrl).toBe("https://acme.local/verify-certificate/ATT-202601-ABCD1234");
    expect(attestation.issuedAt).toEqual(new Date("2026-01-15T00:00:00Z"));
    expect(attestation.revocationReason).toBeNull();
  });
});

describe("isAttestationEligibleCourseType", () => {
  it("n'accepte que les formations non certifiantes", () => {
    expect(isAttestationEligibleCourseType("NON_CERTIFYING")).toBe(true);
    expect(isAttestationEligibleCourseType("CERTIFYING")).toBe(false);
  });
});
