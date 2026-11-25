import { AssessmentsFacade } from "@modules/assessments/assessments.facade";
import { CertificatesFacade } from "@modules/certificates/certificates.facade";
import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

import type { RefundEligibilityData, RefundEligibilityDataPort } from "../domain/refund-eligibility";

/**
 * Lit les critères de la politique de remboursement (section 9.5) auprès des modules enrollments, assessments et
 * certificates, UNIQUEMENT par leurs façades. Ces modules dépendent déjà (directement ou non) de payments : les importer
 * dans PaymentsModule créerait un cycle de modules. Les façades sont donc résolues à l'usage via ModuleRef (contexte
 * global), sans dépendance de module ; si une façade est introuvable, l'appel échoue et la demande suit le circuit
 * manuel (jamais d'acceptation automatique sans données).
 */
@Injectable()
export class RefundEligibilityDataAdapter implements RefundEligibilityDataPort {
  constructor(private readonly moduleRef: ModuleRef) {}

  async load(enrollmentId: string): Promise<RefundEligibilityData> {
    const enrollments = this.moduleRef.get(EnrollmentsFacade, { strict: false });
    const assessments = this.moduleRef.get(AssessmentsFacade, { strict: false });
    const certificates = this.moduleRef.get(CertificatesFacade, { strict: false });

    const [progress, submittedAssessmentAttempts, certificate] = await Promise.all([
      enrollments.getProgressSummary(enrollmentId),
      assessments.countSubmittedAttempts(enrollmentId),
      certificates.findByEnrollmentId(enrollmentId),
    ]);
    return {
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      submittedAssessmentAttempts,
      certificateIssued: certificate !== null,
    };
  }
}
