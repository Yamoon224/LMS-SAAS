import type {
  SupervisedCertificate,
  SupervisedCourse,
  SupervisedLearner,
  SupervisedTransaction,
  SupervisionFilter,
} from "./supervision";

/** Lecture seule des listes de supervision globale (ADM-29 à ADM-32). */
export interface SupervisionRepositoryPort {
  listCourses(filter: SupervisionFilter): Promise<SupervisedCourse[]>;
  listLearners(filter: SupervisionFilter): Promise<SupervisedLearner[]>;
  listCertificates(filter: SupervisionFilter): Promise<SupervisedCertificate[]>;
  listTransactions(filter: SupervisionFilter): Promise<SupervisedTransaction[]>;
}

export const SUPERVISION_REPOSITORY = Symbol("SUPERVISION_REPOSITORY");
