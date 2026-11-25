import { InvalidStateTransitionError } from "@shared/errors";

import { CertificateStatus } from "./certificate-status";
import { Certificate, type CertificateProps } from "./certificate.entity";

function buildCertificate(overrides: Partial<CertificateProps> = {}): Certificate {
  const props: CertificateProps = {
    id: "cert-1",
    enrollmentId: "enr-1",
    templateId: "template-1",
    number: "CERT-202601-ABCD1234",
    status: CertificateStatus.VALID,
    learnerNameSnapshot: "Aïcha Koné",
    courseTitleSnapshot: "Introduction à la comptabilité",
    scorePercent: 85,
    pdfUrl: "tenants/t1/certificates/CERT-202601-ABCD1234.pdf",
    qrVerificationUrl: "https://acme.votredomaine.local/verify-certificate/CERT-202601-ABCD1234",
    revocationReason: null,
    issuedAt: new Date("2026-01-15T00:00:00Z"),
    revokedAt: null,
    ...overrides,
  };
  return Certificate.fromPersistence(props);
}

describe("Certificate", () => {
  it("expose ses valeurs figées et un snapshot détaché", () => {
    const certificate = buildCertificate();
    expect(certificate.id).toBe("cert-1");
    expect(certificate.enrollmentId).toBe("enr-1");
    expect(certificate.number).toBe("CERT-202601-ABCD1234");
    expect(certificate.pdfUrl).toBe("tenants/t1/certificates/CERT-202601-ABCD1234.pdf");
    expect(certificate.qrVerificationUrl).toContain("verify-certificate/CERT-202601-ABCD1234");
    expect(certificate.learnerNameSnapshot).toBe("Aïcha Koné");
    expect(certificate.courseTitleSnapshot).toBe("Introduction à la comptabilité");
    expect(certificate.scorePercent).toBe(85);
    expect(certificate.issuedAt).toEqual(new Date("2026-01-15T00:00:00Z"));
    expect(certificate.revocationReason).toBeNull();
    const snapshot = certificate.toSnapshot() as { learnerNameSnapshot: string };
    snapshot.learnerNameSnapshot = "Autre";
    expect(certificate.learnerNameSnapshot).toBe("Aïcha Koné");
  });

  describe("isVerifiable (ENT-45)", () => {
    it("retourne true pour un certificat VALID", () => {
      const certificate = buildCertificate({ status: CertificateStatus.VALID });
      expect(certificate.isVerifiable()).toBe(true);
    });

    it("retourne false pour un certificat REVOKED", () => {
      const certificate = buildCertificate({ status: CertificateStatus.REVOKED });
      expect(certificate.isVerifiable()).toBe(false);
    });

    it("retourne false pour un certificat REISSUED", () => {
      const certificate = buildCertificate({ status: CertificateStatus.REISSUED });
      expect(certificate.isVerifiable()).toBe(false);
    });
  });

  describe("revoke (ENT-44)", () => {
    it("passe le statut à REVOKED et fixe le motif et revokedAt", () => {
      const certificate = buildCertificate({ status: CertificateStatus.VALID });
      certificate.revoke("Fraude constatée lors de l'examen.");
      expect(certificate.status).toBe(CertificateStatus.REVOKED);
      expect(certificate.revocationReason).toBe("Fraude constatée lors de l'examen.");
      expect(certificate.toSnapshot().revokedAt).not.toBeNull();
    });

    it("rejette la révocation d'un certificat déjà révoqué", () => {
      const certificate = buildCertificate({ status: CertificateStatus.REVOKED });
      expect(() => certificate.revoke("motif")).toThrow(InvalidStateTransitionError);
    });

    it("rejette la révocation d'un certificat réémis", () => {
      const certificate = buildCertificate({ status: CertificateStatus.REISSUED });
      expect(() => certificate.revoke("motif")).toThrow(InvalidStateTransitionError);
    });
  });

  describe("markReissued (ENT-44)", () => {
    it("passe le statut VALID à REISSUED", () => {
      const certificate = buildCertificate({ status: CertificateStatus.VALID });
      certificate.markReissued();
      expect(certificate.status).toBe(CertificateStatus.REISSUED);
    });

    it("rejette la réémission d'un certificat déjà révoqué", () => {
      const certificate = buildCertificate({ status: CertificateStatus.REVOKED });
      expect(() => certificate.markReissued()).toThrow(InvalidStateTransitionError);
    });
  });
});
