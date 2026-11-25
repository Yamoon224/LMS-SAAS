import { Global, Module } from "@nestjs/common";

import { LearnerAssessmentGateRegistry } from "./learner-assessment-gate";

/** Ports transverses entre modules qui ne peuvent pas se référencer directement (anti-cycle). */
@Global()
@Module({
  providers: [LearnerAssessmentGateRegistry],
  exports: [LearnerAssessmentGateRegistry],
})
export class SharedPortsModule {}
