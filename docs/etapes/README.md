# Journal des étapes

Un fichier par étape d'implémentation. Règle de fond : **chaque composant (`backend`, `admin`, `business`, `learning`) contient toutes ses ressources dans son dossier**, sans rien partager avec un autre.

| # | Étape | Référence cahier des charges |
| --- | --- | --- |
| 01 | [Autonomie des composants](01-autonomie-des-composants.md) | section 13.3 (adaptée) |
| 02 | [Abonnement de l'entreprise](02-abonnement-entreprise.md) | ENT-01, 04, 07 |
| 03 | [Historique des paiements et factures PDF](03-factures-entreprise.md) | ENT-05 |
| 04 | [Transactions (ventes en ligne et hors plateforme)](04-transactions-entreprise.md) | ENT-68, RG-07 |
| 05 | [Demandes de remboursement](05-demandes-de-remboursement.md) | ENT-70, ADM-26 |
| 06 | [Suivi et notifications des remboursements](06-suivi-et-notifications-remboursement.md) | ENT-70 |
| 07 | [Relevé PDF des reversements](07-releve-pdf-reversement.md) | ENT-69 |
| 08 | [Rapports par formation](08-rapports-par-formation.md) | ENT-67 |
| 09 | [Mot de passe oublié](09-mot-de-passe-oublie.md) | PUB-04 |
| 10 | [Pages d'activation des back-offices](10-pages-activation-backoffices.md) | ADM-05, ENT-10 |
| 11 | [Supervision globale de l'Admin](11-supervision-admin.md) | ADM-29 à 32 |
| 12 | [Historique d'achats et profil de l'apprenant](12-achats-et-profil-apprenant.md) | PUB-18, PUB-07, PUB-04 |
| 13 | [Pages légales versionnées](13-pages-legales.md) | ADM-41 |
| 14 | [Acceptation des conditions par l'apprenant](14-acceptation-des-conditions.md) | ADM-41 |
| 15 | [Modèles d'e-mails modifiables](15-modeles-d-emails.md) | ADM-38 |
| 16 | [Langues de la plateforme](16-langues-de-la-plateforme.md) | ADM-40 |
| 17 | [Consommation IA (vue Admin)](17-consommation-ia.md) | ADM-34 |
| 18 | [Santé technique (vue Admin)](18-sante-technique.md) | ADM-35 |
| 19 | [Traductions de formation lisibles par l'apprenant](19-traductions-de-formation.md) | PUB-17 |
| 20 | [Reprise de lecture et diffusion vidéo](20-reprise-de-lecture-et-diffusion-video.md) | PUB-16 (partiel) |
| 21 | [Bibliothèque de modèles de certificats](21-bibliotheque-de-modeles-de-certificats.md) | ADM-39 |
| 22 | [Intégrations de la plateforme](22-integrations-de-la-plateforme.md) | ADM-37 |
| 23 | [Remboursement partiel et notification de l'entreprise](23-remboursement-partiel-et-notification-entreprise.md) | ENT-70, RG-25 |
| 24 | [Interface apprenant en huit langues](24-interface-multilingue.md) | PUB-15 |
| 25 | [Paramètres de l'entreprise](25-parametres-entreprise.md) | ENT-08, 11, 12 |
| 26 | [Contenu et inscriptions côté entreprise](26-contenu-et-inscriptions-entreprise.md) | ENT-23, 24, 25, 37, 61, 62 |
| 27 | [Authentification à deux facteurs](27-authentification-a-deux-facteurs.md) | ADM-36, ENT-11, section 11 |
| 28 | [Antivirus, RGPD et hooks Git](28-antivirus-rgpd-et-hooks.md) | sections 4.1, 11 |
| 29 | [Vitrine publique et confort apprenant](29-vitrine-publique-apprenant.md) | PUB-01, 02, 03, 05, 09, 12, 13, 18, SEO |
| 30 | [Finances : paramètres, rapprochement, remboursements](30-finances-parametres-rapprochement-remboursements.md) | ADM-21, 23, 27, section 9.5 |
| 31 | [Renouvellement automatique et prorata](31-renouvellement-et-prorata.md) | ENT-03, ENT-04 |
| 32 | [Admin : alertes et fiche entreprise](32-admin-alertes-et-fiche-entreprise.md) | ADM-01, 03, 08, 10 |
| 33 | [Exploitation : Docker, proxy, BullMQ, Sentry](33-exploitation.md) | sections 3.3, 15, 19.1, BE-08, BE-11 |
| 34 | [Tests front et E2E](34-tests-front-et-e2e.md) | sections 13, 14, 19 |
| 35 | [Attestation de suivi](35-attestation-de-suivi.md) | ENT-44 |
| 36 | [Admin : gestion des entreprises](36-admin-gestion-entreprises.md) | ADM-06, ADM-09, ADM-13, ADM-03 |
| 37 | [Polices arabe et chinois, RTL (écran et PDF)](37-polices-arabe-chinois-rtl.md) | PUB-15, 12.4 |

## Actions à mener hors du code (cumul des étapes)

1. **Schéma** : appliquer `prisma/schema.prisma` (colonne `Refund.decisionNote` — étape 05 ; tables `legal_documents` et `legal_acceptances` — étape 13 ; table `notification_template_overrides` — étape 15 ; table `language_settings` — étape 16 ; table `webhook_events` — étape 18 ; table `certificate_library_templates` — étape 21 ; table `integration_settings` — étape 22) avec `prisma db push` ou votre procédure. Les étapes 25 à 30 ajoutent aussi des tables et colonnes (voir chaque fiche : comptes 2FA, paramètres de plateforme, statuts de médias, anonymisation, rappels d'inactivité, critères de remboursement).
2. **Permissions** : lancer `pnpm db:backfill-roles` pour donner aux rôles existants `refunds.manage` et `learner.request-refund` (étape 05) `legal.manage` (étape 13) `notification-templates.manage` (étape 15) `languages.manage` (étape 16) `certificate-library.manage` (étape 21) `integrations.manage` (étape 22) `settings.manage` et `payout-accounts.verify` (étape 25) `finance-settings.manage` et `payments.reconcile` (étape 30).
3. **Configuration** : variables ajoutées par les étapes 27, 28 : `TOTP_ISSUER`, `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_MAX_SCAN_BYTES`, `MEDIA_SCAN_REQUIRED` (à mettre à true en production), `RETENTION_PURGE_ENABLED` ; CORS du bucket S3 à ouvrir en PUT pour l'origine de `business` (étape 26) ; définir `SECRETS_ENCRYPTION_KEY` (étape 22, ne plus la changer ensuite) ; renseigner `AI_TRANSLATION_COST_PER_WORD` (étape 17) quand le tarif du fournisseur d'IA est connu ; sans elle, coût et marge s'affichent « Non configuré ».
4. **À surveiller** : le journal des webhooks (étape 18) n'est jamais purgé ; prévoir une purge au-delà de quelques semaines.
5. **Jamais testé de bout en bout** : aucune étape n'a été exécutée contre une vraie base, un vrai fournisseur de paiement, un envoi d'e-mail réel ou dans un navigateur.

## Restant à traiter par rapport au cahier des charges

- **Apprenant — qualité vidéo adaptative avec choix manuel (PUB-16)** : bloquée, la diffusion HLS ne peut pas fonctionner en l'état (URL vers un dossier, segments non couverts par la signature, lecteur sans hls.js, gabarit de transcodage absent du dépôt). Elle exige des décisions d'infrastructure AWS/CDN et un accès à votre compte pour être vérifiée : voir l'étape 20.
- **Admin — intégrations** : WhatsApp, AWS (S3, MediaConvert, CloudFront) et OAuth Google ne sont pas couverts (étape 22).
- **Traductions de l'interface (étape 24)** : à faire relire par des locuteurs natifs ; messages d'erreur métier du backend toujours en français.
- **Remboursement** : un seul remboursement par achat ; seul le propriétaire est notifié (étape 23).
