# Rapport de conformité au cahier des charges

**Date** : 2026-11-18 · **Référence** : `docs/Cahier_des_charges_LMS_SaaS.pdf` (v1.3) · **Méthode** : lecture du cahier en six tranches, recoupée avec le code par six audits indépendants, puis vérification par moi des constats les plus lourds.

## Comment lire ce rapport

- **FAIT** = le code existe de bout en bout (backend, et écran si l'exigence en suppose un). **Pas** « testé » : rien n'a jamais été exécuté contre une vraie base, un vrai fournisseur ou un navigateur.
- **PARTIEL** = une partie seulement, le manque est précisé. **ABSENT** = rien dans le code.
- Les audits ont surtout lu les contrôleurs, les noms de fichiers et fait des recherches ciblées ; les logiques internes ne sont pas toutes relues. Les verdicts « FAIT » sont à lire comme « implémenté et cohérent avec le cahier ». Les sous-estimations possibles sont signalées.

## 1. Synthèse chiffrée (exigences fonctionnelles)

| Composant | Exigences | Fait | Partiel | Absent |
| --- | --- | --- | --- | --- |
| Admin (ADM-01 à 41) | 41 | 12 | 20 | 9 |
| Entreprise (ENT-01 à 71) | 71 | 26 | 31 | 14 |
| Apprenant (PUB-01 à 18) | 18 | 8 | 10 | 0 |
| **Total** | **130** | **46 (35 %)** | **61 (47 %)** | **23 (18 %)** |

Les 23 absents sont en grande partie des V1/V2 (cohérent avec leur priorité). Les écarts qui comptent sont les **PARTIEL et ABSENT classés MVP**, listés ci-dessous. Les cycles de vie de la section 8.1 sont tous implémentés (matrices de transitions présentes) avec deux écarts : le certificat passe de Valide à Réédité (le cahier dit Révoqué à Réédité), et la traduction n'a pas d'état « Publiée » dans son énumération (la publication est gérée à part).

## 2. Écarts MVP prioritaires

### Entreprise : ce qui bloque une entreprise réelle
1. **Paramètres de l'entreprise non exposés (ENT-08, 11, 12, 14).** Le tenant a les colonnes `branding`, `payoutAccount` (+ vérification), `offlinePaymentEnabled/Instructions`, mais **aucune route ni écran Entreprise ne les modifie**. Conséquences : pas de logo ni de couleurs, **pas de coordonnées de reversement** (donc les reversements ne peuvent être ni configurés ni vérifiés), pas d'instructions de paiement hors plateforme.
2. **Création de contenu inutilisable depuis l'interface (ENT-23, 24, 25).** Pas d'éditeur riche (le cahier cite CKEditor 5), **pas d'écran d'upload de médias** alors que le backend (URL présignées, transcodage) est complet, pas de réglage du seuil de visionnage (90 %).
3. **Attestation de suivi (ENT-44)** pour les formations non certifiantes : absente, alors que le parcours apprenant (7.1, étape 7) et la recette l'attendent.
4. **Inscription manuelle à une formation (ENT-62)** : aucune route ; **refus motivé d'un paiement hors plateforme (ENT-61)** : le statut existe, pas la route.
5. **Google (ENT-53)** : le code utilise un compte de service unique de la plateforme ; le cahier demande l'**OAuth de chaque entreprise** (leur calendrier). Pas de pointage manuel de présence (ENT-57), pas de `.ics` ni de rappels WhatsApp (ENT-56).
6. **Examens (ENT-34, 37)** : pas de pondération ; pas de liste des tentatives d'examen côté entreprise ni d'export.
7. **Changement de plan (ENT-04)** et **renouvellement (ENT-03)** : montée en gamme immédiate seulement ; descente de gamme non persistée ; **aucun prorata** ; **aucun renouvellement automatique par carte** (seulement des rappels J-7/J-3/J-1) ni lien de paiement mobile money à l'échéance.

### Admin
1. **Tableau de bord (ADM-01, 03)** : KPI incomplets (pas d'entreprises en essai/suspendues, ARR, revenus crédits IA, certificats) et **aucune alerte** (paiements échoués, échéances, reversements en attente…). Les graphiques (ADM-02) sont V1.
2. **Provisionnement des sous-domaines (ADM-07)** : aucun code DNS/certificat/test d'accessibilité.
3. **Finances** : frais de transaction non paramétrables (ADM-21, `feeChargedToTenant` codé en dur) ; paramètres de reversement (ADM-23) = constante de 7 jours, seuil de 10 000 non réglable, **pas de fréquence ni de reversement automatique** ; **rapprochement et rejeu des webhooks (ADM-27) absents** ; registre Admin des ventes hors plateforme (ADM-25) absent ; exécution des reversements manuelle (pas d'API de transfert).
4. **Entreprises** : fiche 360° (ADM-10) réduite à deux cartes ; pas de route d'archivage (ADM-08) alors que l'état existe ; pas de gestion des utilisateurs d'une entreprise côté Admin (ADM-06) ; abonnement : pas de prolongation/remise/plan offert (ADM-09) ; plans non modifiables (ADM-13, pas d'édition du nom).
5. **Crédits IA (ADM-18)** : packs et prix existent ; pas de règle de conversion crédits/mots ni de report configurable. **Supervision (ADM-29)** : lecture seule, pas de dépublication d'un contenu signalé.
6. **Intégrations (ADM-37)** : quatre fournisseurs gérés ; manquent WhatsApp, AWS ; **interface Admin traduite en 3 langues sur 8** (ADM-40).

### Apprenant
1. **Vitrine publique (PUB-01, 02, 03)** : l'accueil est directement le catalogue (pas de présentation de l'entreprise, ni formations phares) ; le catalogue n'a que recherche et catégorie (**pas de filtre langue/niveau/prix, pas de tri**, le backend n'accepte que `category`) ; la fiche n'affiche ni programme, ni objectifs, ni formateur, ni sessions live, ni modèle de certificat.
2. **Tableau de bord (PUB-05)** : pas de vue agrégée (« prochaines sessions live » seulement dans chaque inscription).
3. **Lecteur (PUB-09)** : pas de visionneuse PDF intégrée ; **qualité vidéo adaptative absente (PUB-16, déjà documentée, bloquée par vos décisions AWS/CDN)**.
4. **Certificats (PUB-12)** : pas de partage LinkedIn ; **sessions live (PUB-13)** : pas d'ajout à l'agenda (.ics) ; **notifications (PUB-18)** : rappel d'inactivité absent.
5. **SEO** : titres et descriptions présents, mais **ni `sitemap` ni `robots`**, ni balises Open Graph.

## 3. Sécurité et conformité

| Exigence | État |
| --- | --- |
| **2FA (TOTP) pour Admin et propriétaires** (exigée) | **ABSENT** : les colonnes existent en base, aucune logique |
| Mots de passe hachés (argon2), JWT court + refresh révocables, limitation de débit, helmet/HSTS | FAIT |
| Secrets chiffrés AES-256-GCM | FAIT (sel de dérivation fixe ; pas de rotation de clé) |
| Webhooks signés, idempotents, re-vérifiés auprès du fournisseur | FAIT |
| Isolation des tenants | FAIT dans le code applicatif (guard + `tenantId` partout) ; pas de Row Level Security (le cahier la dit « renforçable ») ; tests d'étanchéité : 2 cas d'intégration + specs par module, pas de matrice d'accès par identifiant |
| Protection CSRF explicite | non trouvée (cookies httpOnly + proxy : à vérifier) |
| **Antivirus des uploads, filigrane vidéo dynamique** | **ABSENT** |
| **Loi 2013-450 / RGPD** : export et suppression de données, durée de conservation, registre | **ABSENT** (seul le consentement aux pages légales existe) |
| **TVA paramétrable, facturation électronique DGI** | **ABSENT** |
| Mandat d'encaissement / validation BCEAO | hors code (point juridique à traiter avec un juriste) |
| Test d'intrusion OWASP | hors code, à planifier avant la production |
| Grand livre immuable | non modifié par le code ; **aucune garde en base** (trigger ou droits) |
| Commission et frais isolés au grand livre | **PARTIEL** : seul le net est tracé ; la devise « XOF » est codée en dur dans les écouteurs |

L'exemple de calcul de la section 9.3 (50 000 − 1 250 − 5 000 = **43 750**) est correct dans la formule et repris par un test.

## 4. Paiements (section 9 et BE-04/05)

- Deux fournisseurs (Paystack, Pixel Innov) ; **aucun agrégateur de secours**, et **la bascule n'a lieu que si la configuration est invalide**, pas sur une panne d'exécution (BE-04).
- **Pas de sondage du mobile money en attente**, pas de rejeu depuis l'Admin, pas de gestion explicite des événements d'abonnement carte (`subscription.disable`, `invoice.payment_failed`).
- **Politique de remboursement (9.5)** : le circuit entreprise puis Admin et le remboursement partiel existent ; les **contrôles automatiques manquent** : progression < 20 %, absence de quiz/examen/certificat (la fenêtre de 7 jours est indicative seulement) ; pas de remboursement d'abonnement (72 h), de formation devenue inaccessible, de doublon ; restitution des crédits IA en cas d'échec gérée (ENT-48).
- Factures PDF numérotées : abonnements et crédits seulement ; pas de reçu pour les ventes de formation ; pas de modèle `Invoice` en base.

## 5. Infrastructure et déploiement (sections 3.3, 15, 19.1)

**Rien de déployable dans le dépôt** : ni Dockerfile, ni reverse proxy, ni certificat joker, ni infrastructure AWS (CloudFront, EventBridge), ni procédure de sauvegarde (RPO/RTO), ni étape de déploiement dans la CI. Seuls existent un `docker-compose` de développement et la CI (lint, types, architecture, tests unitaires et d'intégration, build). Le livrable « scripts d'infrastructure » (19.1) est donc absent, et le scénario de recette « HTTPS immédiat sur `{slug}` et `{slug}-backoffice` » n'est pas démontrable.

**BullMQ (BE-08)** n'est utilisé que pour les notifications : traduction IA, PDF, transcodage et rappels ne passent pas par une file avec reprise. **Pas de WebSocket** (3.1), **pas de Sentry** ni d'alertes (BE-11).

## 6. Qualité logicielle et tests (sections 13, 14, 19)

| Point | État |
| --- | --- |
| Backend : 4 couches, ports et façades, domaine pur, `dependency-cruiser` en CI | **FAIT** (point fort) |
| TypeScript strict, ESLint (a11y), Prettier, CI | FAIT |
| Hooks Husky / commitlint | **PARTIEL** : déclarés dans `package.json`, mais **aucun dossier `.husky`** donc aucun hook actif ; lint-staged sans ESLint |
| Tests backend | 103 suites / 791 tests ; seuil de couverture 80 % configuré sur domain et application, **couverture non mesurée** ; 2 fichiers d'intégration seulement |
| **Tests front** | **12 fichiers au total** (admin 5, business 3, learning 4), environnement node, **sans Testing Library ni MSW, sans seuil de 70 %** |
| **E2E Playwright, k6, OWASP ZAP, tests de contrat des fournisseurs, axe** | **ABSENT** ; le seul parcours « smoke » est un script manuel hors CI |
| SonarQube (complexité, duplication), ADR, Definition of Done, modèle de PR, déploiement préproduction | **ABSENT** |
| Un schéma PostgreSQL par module | **ABSENT** (un seul schéma) |
| Storybook, client API généré depuis l'OpenAPI | **ABSENT** |
| Budgets de performance (LCP, INP, CLS, JS < 200 Ko), `prefers-reduced-motion`, polices Noto (arabe, chinois) | **ABSENT** ou non trouvés (la police est latine : repli système pour l'arabe et le chinois ; le JS partagé de `learning` fait ~102 kB) |
| Palette de commandes Ctrl+K, glisser-déposer du constructeur de formation, PWA | ABSENT (Ctrl+K et PWA sont V1) ; le glisser-déposer des **modules** existe |
| Recherche UX, maquettes Figma, tests SUS | hors dépôt (aucun artefact) |

**Écart voulu, à connaître** : le cahier (13.3) demande un monorepo avec `packages/ui`, `api-client`, `i18n`, `config` **partagés**. Vous avez exigé l'inverse dès l'étape 01 (« aucune ressource partagée entre deux composants »). Les composants UI sont donc dupliqués entre `admin`, `business` et `learning` : c'est conforme à votre règle, pas au cahier. À arbitrer explicitement.

## 7. Recette (section 19.2) : les 20 scénarios sont-ils exécutables ?

Les parcours sont **en grande partie réalisables par le code, mais aucun n'est prouvé** : un script de fumée manuel couvre tenants, contenu, apprenants, cours payant et permissions. Aucun test automatisé pour : entreprise sans abonnement, échec de renouvellement, reversement, remboursement de bout en bout, bascule de fournisseur, paiement hors plateforme, session Meet, arabe/PDF. **Le PDF d'un certificat en arabe ne s'affichera pas correctement** (polices PDF standard). Quatre scénarios sont **hors de portée du dépôt** : HTTPS immédiat, tests d'utilisabilité (SUS 80), vidéo 360 p sur réseau mobile avec filigrane, test d'intrusion.

## 8. Section 16 (idées V1/V2) et section 18.2 (questions ouvertes)

Sur les 29 idées (PROP-01 à 29), seul l'essai gratuit (`trialDays`, PROP-26) est présent ; le SMS l'est partiellement (PROP-22, pas de WhatsApp). Les questions Q1 à Q7 du 18.2 sont des décisions à prendre (non évaluables dans le code).

## 9. Fiabilité de ce rapport

- Corrections apportées aux audits : la barre de navigation mobile **existe** (`MobileNav`) ; un audit avait décalé la numérotation PUB d'un cran (j'ai recoupé avec le cahier) ; l'interface apprenant est **maintenant en 8 langues** (étape 24).
- Verdicts encore à confirmer par lecture fine : tout ce qui porte « non creusé » dans les audits (par ex. la profondeur de la duplication de formation, la couverture des 5 jauges d'usage, les rappels J-1/H-1 des sessions live, les mises à jour d'inscription).

## 10. Ordre de traitement que je recommande

1. **Débloquer une entreprise réelle** : écrans Entreprise de paramètres (marque, coordonnées de reversement, hors plateforme), upload de médias, éditeur riche, seuil de visionnage, inscription manuelle, refus hors plateforme.
2. **Sécurité exigée** : 2FA TOTP, antivirus des uploads, export/suppression de données, hooks Husky actifs.
3. **Vitrine publique** : accueil, filtres et tri du catalogue, fiche complète, sitemap/robots, tableau de bord apprenant.
4. **Finances** : renouvellement automatique et prorata, paramètres de reversement et frais, rapprochement, contrôles automatiques de remboursement, commission et frais isolés au grand livre.
5. **Exploitation** : Dockerfile, reverse proxy, SSL joker, sauvegardes, files BullMQ, Sentry.
6. **Qualité** : tests front et E2E, mesure de couverture, polices arabe et chinoise (écran et PDF).
7. **Décisions de votre côté** : AWS/CDN pour la vidéo adaptative, `packages/ui` partagé ou non, OAuth Google par entreprise ou compte de service, aspects juridiques (BCEAO, TVA, RGPD).
