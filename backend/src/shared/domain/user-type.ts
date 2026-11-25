/**
 * Type d'utilisateur, partagé par plusieurs domaines (auth, users).
 * Dupliqué ici (plutôt qu'importé de @prisma/client) pour que le domaine
 * reste pur et indépendant de l'ORM (section 13.2). Les valeurs doivent
 * rester synchronisées avec l'enum `UserType` de prisma/schema.prisma.
 */
export type UserType = "PLATFORM_ADMIN" | "COMPANY_USER" | "LEARNER";
