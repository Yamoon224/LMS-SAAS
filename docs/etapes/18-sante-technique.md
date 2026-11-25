# Étape 18 — Santé technique (vue Admin)

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-35 (lot V1) — « état des files de tâches, taux d'erreur des webhooks, espace de stockage global ».

## Ce qui est mesuré

| Composant | Mesure | Seuil « dégradé » |
| --- | --- | --- |
| **File de tâches** (envoi d'e-mails et de SMS) | Tâches en attente, en cours, différées, en échec, en pause. | Au moins une tâche en échec, ou plus de 100 tâches en attente ou différées. |
| **File injoignable** (ex. Redis arrêté) | Signalée « Arrêté » avec un message explicite, **sans faire échouer le reste de la page**. | — |
| **Webhooks de paiement** (24 dernières heures) | Reçus et en erreur, par fournisseur et au total. Erreur = signature invalide, référence inconnue ou échec de traitement ; les doublons (réémission du fournisseur) ne comptent pas. | 20 % d'erreurs ou plus, sur au moins 5 événements (en dessous, le taux n'est pas significatif). |
| **Stockage global** | Taille cumulée et nombre de fichiers téléversés, plus les 5 entreprises les plus consommatrices. | Aucun seuil (pas de quota global défini dans le cahier des charges). |

L'état global est le plus grave des composants ; « aucune donnée » ne dégrade rien. La page est relue **toutes les 30 secondes** et propose un bouton « Actualiser ».

## Ce qui n'existait pas et a été ajouté : le journal des webhooks

Les webhooks n'étaient journalisés nulle part : leur taux d'erreur n'était donc pas calculable. `ProcessWebhookUseCase` enregistre maintenant l'issue de chaque webhook d'un **fournisseur connu** (`PROCESSED`, `DUPLICATE`, `UNKNOWN_REFERENCE`, `INVALID_SIGNATURE`, `ERROR`), avec fournisseur et date, **jamais le contenu** (le corps brut peut contenir des données de paiement).

Garde-fous, testés :
- Une panne du journal **ne fait jamais échouer un webhook** (l'erreur est seulement tracée) ; quand le traitement et le journal échouent ensemble, c'est l'erreur d'origine qui remonte.
- Un fournisseur **inconnu n'est pas journalisé** : le code vient de l'URL de la route publique, n'importe qui pourrait sinon remplir le journal.
- Le comportement de traitement des paiements est inchangé (les 6 tests existants passent sans modification de leurs attentes).

## Backend

| Fichier | Rôle |
| --- | --- |
| `analytics/domain/platform-health.ts` (+ spec) | Évaluation des files, synthèse des webhooks par fournisseur, synthèse du stockage, état global. |
| `analytics/infrastructure/platform-health.prisma-repository.ts` | Comptages groupés des webhooks sur 24 h et tailles de fichiers par entreprise. Lecture seule. |
| `analytics/application/get-platform-health.use-case.ts` (+ spec) | Assemble le rapport ; une file injoignable devient « Arrêté ». |
| `analytics/presentation/admin-health.controller.ts` | `GET /admin/health` (permission `analytics.view`). |
| `notifications` : `NotificationQueuePort.getStats`, adaptateur BullMQ, `NotificationsFacade.getQueueStats` | État de la file, exposé par la **façade publique** du module (aucun import interne). |
| `payments` : `WebhookEventLogPort`, `webhook-event-log.prisma-repository.ts`, `process-webhook.use-case.ts` | Journal des issues. |

## Modèle de données — à appliquer

`prisma/schema.prisma` : table `webhook_events` (+ enum `WebhookOutcome`) → `prisma db push`. Le client Prisma est déjà régénéré ici. Aucune nouvelle permission ni variable d'environnement.

## Front Admin (`admin/features/platform-health/`)

Page `/health` (menu « Suivi ») : état global, carte des files (compteurs ou message d'indisponibilité), carte des webhooks par fournisseur, carte du stockage avec les entreprises les plus consommatrices, taille lisible (Ko, Mo, Go).

## Limites connues

- **Une seule file est surveillée** : celle des notifications, la seule file existante dans le code. Une file ajoutée plus tard devra être déclarée dans le cas d'usage.
- **Les webhooks reçus avant cette étape ne sont pas comptés** : le taux d'erreur n'a de sens qu'après un certain temps de fonctionnement.
- **Le journal des webhooks n'est jamais purgé** : une ligne par webhook de fournisseur connu. À surveiller (purge au-delà de quelques semaines à prévoir) ; la page ne lit que les 24 dernières heures.
- **Stockage : fichiers d'origine uniquement.** Les versions vidéo transcodées (HLS) ne sont pas suivies en base et ne sont pas comptées : le total est un minimum, pas la consommation réelle du stockage objet. Il ne mesure ni la base de données ni le disque du serveur.
- Pas d'alerte automatique (e-mail, notification) quand l'état se dégrade : la page doit être consultée.
- Pas d'historique : seul l'état courant est affiché.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 92 suites / 616 tests OK. Nouveaux : 25 (évaluation des files, taux d'erreur par fournisseur avec seuil de significativité, doublons non comptés, classement du stockage, état global, **file injoignable sans panne de la page**, **issues du journal et indépendance vis-à-vis d'une panne du journal**).
- Admin : `tsc`, ESLint OK, 35 tests OK (dont le format des tailles).
- **Non testé** : exécution des requêtes groupées sur une vraie base, état réel d'une file Redis (en marche, arrêtée, engorgée), affichage et rafraîchissement dans le navigateur.
