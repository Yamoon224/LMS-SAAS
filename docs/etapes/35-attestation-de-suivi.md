# Étape 35 — Attestation de suivi (formations non certifiantes)

**Date** : 2026-11-19
**Référence cahier des charges** : ENT-44 — attestation de suivi pour les formations non certifiantes ; parcours apprenant (7.1) ; RG-21 (une formation non certifiante n'a ni examen ni certificat, elle est terminée quand tous les modules sont validés).

## Choix de conception (pris sans consultation, à valider)

1. **Certificat OU attestation, jamais les deux.** Si la formation est certifiante, c'est le certificat qui s'applique ; l'attestation n'est délivrée que pour le type `NON_CERTIFYING`.
2. **Seuil de complétion = règle existante** : la délivrance s'abonne à l'événement `enrollment.completed` déjà émis par `CompleteNonCertifyingCourseUseCase` (tous les modules validés, RG-21). Aucune règle de complétion n'est dupliquée.
3. **Table dédiée** `attendance_certificates` (modèle Prisma `Attestation`) plutôt qu'un type dans `certificates` : un certificat exige un modèle de design et un score que l'attestation n'a pas.
4. **Une seule attestation par inscription** (`enrollment_id` unique). Idempotence double : contrôle préalable + gestion de la violation d'unicité en cas de concurrence.
5. **Numéro `ATT-AAAAMM-XXXXXXXX`**, unique et jamais réutilisé (contrainte `@unique`). Le préfixe `ATT-` distingue le type à la vérification publique.
6. **Valeurs figées à la délivrance** (comme RG-14) : nom de l'apprenant, titre de la formation, progression (% de leçons terminées), durée estimée, dates de début et de fin (fin = date de complétion de l'inscription).
7. **PDF sobre**, rendu par un adaptateur PDFKit dédié (`pdfkit-attestation-renderer.adapter.ts`) : titre « Attestation de suivi », période, durée, progression, mention « ne constitue pas un certificat de réussite », QR de vérification. Aucune mention de réussite ni de score. Le moteur de design des certificats n'est pas modifié.
8. **Stockage identique aux certificats** : même port `CertificateStoragePort` (S3 / CloudFront signé), clé `tenants/<tenant>/certificates/ATT-….pdf`, URL signée de 5 minutes.
9. **Révocation motivée** (statut `VALID` → `REVOKED`, état final, motif obligatoire) ; l'événement `attestation.revoked` est consommé par le journal d'audit (acteur + motif). Pas de réémission.
10. **Vérification publique étendue** : `GET /public/certificates/verify/:number` reconnaît le préfixe `ATT-` et répond avec `type: "ATTESTATION"` (les certificats répondent `type: "CERTIFICATE"`).

## Backend (`backend/src/modules/certificates/`)

| Élément | Rôle |
| --- | --- |
| `domain/attestation.entity.ts`, `attestation-status.ts`, `attestation-number.ts`, `attestation.repository.port.ts`, `attestation-pdf-renderer.port.ts` | Entité pure (révocation, vérifiabilité, éligibilité du type de formation), numéro, ports. |
| `application/issue-attestation.use-case.ts` | `@OnEvent("enrollment.completed")` : refuse un cours certifiant, idempotent, fige les données, génère et stocke le PDF, émet `attestation.issued`. Un échec est journalisé sans bloquer la complétion. |
| `application/attestation.use-cases.ts` | Liste (entreprise / apprenant), URL de téléchargement (entreprise, apprenant avec contrôle anti-IDOR, usage interne), révocation, vérification publique. |
| `infrastructure/attestation.prisma-repository.ts`, `pdfkit-attestation-renderer.adapter.ts` | Persistance ; rendu PDF. |
| `presentation/business-attestations.controller.ts` | `GET /business/attestations`, `GET …/:id/download-url`, `POST …/:id/revoke` (permission `certificates.manage`). |
| `presentation/public-attestations.controller.ts` | `GET /public/attestations/mine`, `GET …/:id/download-url` (permission `learner.view-own-enrollments`, inscription contrôlée). |
| `certificates.events.ts` | `AttestationIssuedEvent`, `AttestationRevokedEvent`. |
| Notifications | `attestation-issued.listener.ts` + gabarit `attestation.issued` (fr, en ; surchargeable par l'Admin). |
| Audit | `attestation.issued` et `attestation.revoked` ajoutés à `AuditSensitiveEventsListener`. |

Tests (15) : numéro et reconnaissance du préfixe, entité (révocation avec motif, motif vide refusé, double révocation refusée, valeurs figées), délivrance (valeurs figées, **non-délivrance pour un cours certifiant**, **idempotence**, collision concurrente), révocation (portée par tenant, événement d'audit, NotFound), vérification (valide, révoquée, inconnue).

### Modèle de données — à appliquer

- `prisma/schema.prisma` : enum `AttestationStatus`, modèle `Attestation` (table `attendance_certificates`) et relation inverse `Enrollment.attestation` ; strictement additif → `prisma db push`, puis `prisma generate` (le client n'a pas pu être régénéré par l'agent si le serveur de dev verrouille la DLL).
- Aucune nouvelle permission (réutilise `certificates.manage` et `learner.view-own-enrollments`).

## Fronts

- **Apprenant** (`learning/src/features/certificates/`) : la page « Certificats » a deux onglets (« Certificats », « Attestations »). Carte d'attestation (statut, numéro, date, progression, téléchargement par URL signée demandée au clic, copie du lien de vérification), états chargement / erreur avec « Réessayer » / vide. Textes dans les 8 dictionnaires (`certificates.tabs`, `certificates.attestations`, `verify.attestation*`). La page publique « Vérifier » affiche « Attestation de suivi authentique », la progression et la mention de non-certificat.
- **Entreprise** (`business/src/features/certificates/`) : onglet « Attestations » (tableau ≥ md, cartes en mobile, recherche, tri, export), téléchargement, révocation motivée via le dialogue existant (libellé paramétrable). L'interface Entreprise n'a pas de dictionnaires : textes en français comme le reste de la section.

## Limites connues

- **Aucun rattrapage des inscriptions déjà terminées** avant le déploiement : seules les complétions futures déclenchent une attestation.
- Pas de réémission d'une attestation révoquée ; pas de modèle de design personnalisable (mise en page fixe, sobre).
- Langue du PDF : français ou anglais selon la langue de l'inscription ; autres langues en français. Polices PDF standard (alphabets non latins non couverts).
- Le pourcentage est le rapport leçons terminées / leçons de la formation ; il peut être inférieur à 100 % si des leçons facultatives ne sont pas faites. « Dernière activité » n'est pas suivie séparément : la date de fin est celle de la complétion.
- La page publique de vérification n'indique pas la raison d'une invalidité (révoquée ou inconnue), comme pour les certificats.
- Hors périmètre : relais Next.js des fronts (aucun nouveau relais nécessaire, le client API générique est utilisé).

## Vérification

- Backend : `tsc` OK pour les fichiers de l'étape (restent deux erreurs Sentry préexistantes), 2 suites / 15 tests OK.
- Learning : `tsc`, ESLint OK, tests des dictionnaires (clés identiques dans les 8 langues) OK. Business : voir le rapport de l'agent.
- **Non testé** : exécution sur une vraie base, génération réelle du PDF et du stockage S3, parcours de bout en bout dans le navigateur.
