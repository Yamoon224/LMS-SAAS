# Étape 22 — Intégrations de la plateforme

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-37 — « Fournisseur IA, service e-mail/SMS/WhatsApp, Google (OAuth pour Meet), AWS (S3, MediaConvert, CloudFront). Secrets chiffrés. »

## Choix de conception (pris sans consultation, à valider)

1. **Quatre intégrations gérées** : traduction IA, e-mail (SMTP), passerelle SMS, Google Calendar/Meet. Ce sont celles dont le code lisait déjà des variables d'environnement et qui peuvent être relues à chaque appel.
2. **Priorité de configuration : saisie Admin > variables d'environnement > valeur par défaut.** L'environnement reste la valeur de départ : rien ne change tant que l'Admin ne saisit rien. Le bouton « Revenir à l'environnement » supprime la saisie.
3. **Les secrets sont chiffrés (AES-256-GCM, `SECRETS_ENCRYPTION_KEY`) et ne ressortent jamais** : ni dans les réponses de l'API, ni dans le journal d'audit, ni dans les formulaires. Un secret laissé vide à l'enregistrement est **conservé** ; une case « Supprimer la valeur enregistrée » le retire explicitement.
4. **Pas d'OAuth pour Google** : le cahier mentionne « OAuth pour Meet », mais le code utilise un compte de service Google (aucune connexion Google par entreprise). J'ai gardé ce fonctionnement ; un vrai flux OAuth serait une autre étape.
5. **Garde anti-SSRF** : toute URL saisie doit être en HTTPS, sans identifiants, et viser un hôte public (refus de `localhost`, adresses privées/réservées IPv4 et IPv6, `169.254.169.254`, noms `.internal`/`.local`, noms sans point). Un relais interne légitime se configure par l'environnement, pas par l'écran.
6. **Audit (RG-19)** : chaque enregistrement ou réinitialisation est journalisé avec l'auteur et **les noms des champs modifiés, jamais leurs valeurs**.

## Constat sur l'existant

Les quatre adaptateurs lisaient `process.env` **une seule fois, à la construction** : une modification n'aurait jamais été prise en compte sans redémarrage. Ils lisent maintenant leur configuration **à chaque utilisation** via la façade du nouveau module (avec un cache de 15 s). Le transporteur SMTP n'est recréé que si la configuration a changé.

## Backend (`backend/src/modules/integrations/`)

| Élément | Rôle |
| --- | --- |
| `domain/integration-catalog.ts` (+ spec, 42 tests) | Catalogue (champs, secret ou non, variable d'environnement de repli), validation, garde anti-SSRF, fusion Admin > environnement > défaut. |
| `application/integrations.use-cases.ts` (+ spec, 15 tests) | Résolution avec cache, liste (sans secrets), enregistrement (chiffrement), réinitialisation, e-mail d'essai. |
| `infrastructure/` | Dépôt Prisma ; envoi d'essai nodemailer (délais de 10 s). |
| `integrations.facade.ts`, `integrations.events.ts` | API publique : `resolve(provider)` ; événement d'audit sans valeurs. |
| `presentation/admin-integrations.controller.ts` | `GET /admin/integrations`, `PUT` et `DELETE /admin/integrations/:provider`, `POST /admin/integrations/EMAIL_SMTP/test` (permission `integrations.manage`). |

Adaptateurs modifiés : e-mail et SMS (notifications), traduction (ai-translation), Google Calendar (live-sessions). Un secret **illisible** (clé maître changée) est ignoré avec une erreur dans les logs, et la plateforme se rabat sur l'environnement au lieu de tomber.

Règles testées : secret jamais stocké en clair ni renvoyé ; refus sans écriture si la clé maître du serveur manque ; refus d'une URL interne ; secret conservé à la sauvegarde suivante ; cache invalidé par une modification ; événement d'audit sans valeur ; échec SMTP restitué sans divulguer le mot de passe.

## Admin (`admin/src/features/integrations/`, page `/integrations`)

Une carte par intégration avec son origine (« Configurée dans l'Admin », « Variables d'environnement du serveur », « Non configurée ») et les champs obligatoires manquants ; fenêtre de configuration (secrets masqués, jamais préremplis, clé PEM en zone de texte) ; pour l'e-mail, un **test d'envoi** ; confirmation avant de revenir à l'environnement. 5 tests sur la construction du corps de requête (secret vide omis, suppression explicite).

## Actions à mener hors du code

- `prisma db push` pour la table `integration_settings`.
- `pnpm db:backfill-roles` pour la permission `integrations.manage`.
- **Définir `SECRETS_ENCRYPTION_KEY`** sur le serveur : sans elle, l'enregistrement d'un secret est refusé avec un message explicite. **Ne pas la changer ensuite** : les secrets déjà enregistrés deviendraient illisibles (repli sur l'environnement, à ressaisir).

## Limites connues

- **WhatsApp, AWS (S3, MediaConvert, CloudFront) et les passerelles de paiement** ne sont pas gérés ici. AWS crée ses clients au démarrage (la relecture à chaud demande un autre découpage) ; WhatsApp n'a aucun adaptateur ; les passerelles de paiement ont déjà leur écran et leur chiffrement (`admin/payments`).
- **Anti-SSRF limité au nom d'hôte écrit** : un nom DNS public qui résout vers une adresse privée (ou un changement de résolution après coup, « DNS rebinding ») n'est pas détecté. Les saisies viennent d'un rôle Admin de confiance ; une vraie défense demande de résoudre et de figer l'adresse au moment de l'appel.
- **Cache local à chaque processus** : avec plusieurs instances, une modification peut mettre jusqu'à 15 s à être vue partout.
- L'e-mail d'essai teste la configuration **enregistrée**, pas celle en cours de saisie.
- Rotation de la clé maître non prévue (pas de rechiffrement).
- Pas de test d'appel pour la traduction, le SMS et Google (seul SMTP a un test).

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, test de couverture des permissions OK, 102 suites / 768 tests OK.
- Admin : `tsc`, ESLint OK, 51 tests OK.
- **Non testé** : écriture réelle en base, chiffrement avec une vraie clé de serveur, envoi SMTP réel, appel des fournisseurs avec une configuration saisie dans l'Admin, affichage dans un navigateur.
