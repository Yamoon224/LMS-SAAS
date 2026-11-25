# Étape 30 — Finances : paramètres, reversement automatique, rapprochement, éligibilité des remboursements

**Date** : 2026-11-18
**Référence cahier des charges** : ADM-21, ADM-23, ADM-27, BE-04 à BE-07, sections 5.4, 9.4, 9.5, 9.6.
**Rapport d'écarts** : `docs/RAPPORT-CONFORMITE-CDC.md` sections 2 et 4.

Ferme cinq écarts : paramètres financiers codés en dur, absence de reversement automatique, commission et frais non isolés au grand livre, absence de rapprochement et de rejeu des webhooks, politique de remboursement non contrôlée. Le renouvellement d'abonnement et le prorata ne sont pas touchés.

## Exigences traitées

1. **Paramètres financiers (ADM-21, ADM-23)** : rétention (0 à 90 jours), seuil minimal de reversement (entier ≥ 0), fréquence (MANUAL, WEEKLY, MONTHLY), porteur des frais de transaction (TENANT, PLATFORM). Défauts = comportement historique (7 jours, 10 000, MANUAL, TENANT). Lecture à l'usage avec cache de 30 s, audit de chaque changement, écran Admin.
2. **Reversement automatique (ADM-23)** : tâche planifiée quotidienne, demandes REQUESTED générées pour les entreprises éligibles, double validation humaine inchangée.
3. **Commission et frais isolés au grand livre** : écritures équilibrées distinctes, relevé PDF ventilé, devise du paiement.
4. **Rapprochement (ADM-27, section 9.6)** : sondage des paiements PENDING, expiration, rejeu des webhooks, détection et remboursement des doublons.
5. **Éligibilité au remboursement (section 9.5)** : règle de domaine pure, acceptation automatique, critères affichés à l'entreprise.

## Choix de conception (pris sans consultation, à valider)

### Paramètres
1. **Module `platform-settings`** (façade `PlatformSettingsFacade`), table `platform_settings` clé/valeur **en ajout seul** : un changement insère une ligne avec sa date d'effet, jamais de mise à jour. La valeur en vigueur est la ligne la plus récente dont la date est passée. L'effet est immédiat (pas de date d'effet future saisissable dans l'écran : la structure le permettrait).
2. **« Ventes futures uniquement »** : la date de disponibilité et le net sont calculés à l'enregistrement de la vente et figés dans ses écritures. Le seuil de reversement, lui, s'applique à la demande en cours (il ne concerne pas une vente).
3. **Valeur stockée illisible** : retombe sur le défaut (jamais d'exception à la lecture d'une vente).
4. **Cache de 30 s par processus** ; un changement invalide le cache du processus qui l'a reçu, les autres instances rattrapent en 30 s au plus.
5. **Audit** : événement `finance-setting.changed` (champ, ancienne et nouvelle valeur, auteur), jamais de secret. Un champ inchangé n'écrit ni version ni audit.

### Reversement automatique
6. **Vague quotidienne à 06:00** (cron), le cas d'usage décide : WEEKLY = le lundi, MONTHLY = le 1er du mois (UTC), MANUAL = jamais.
7. **Les contrôles sont ceux de la demande manuelle** (`RequestPayoutUseCase`) : seuil, compte vérifié (`getVerifiedPayoutDestination`, fourni par l'autre lot), et désormais **une seule demande ouverte par entreprise** (REQUESTED, VALIDATED ou APPROVED). Cette dernière garde s'applique **aussi aux demandes manuelles** : le solde n'est débité qu'à l'exécution, une seconde demande aurait porté sur les mêmes fonds. Changement de comportement à valider.
8. **Auteur « système »** : `PayoutRequestedEvent.automatic = true`, repris dans l'audit (`after: { automatic: true }`). Aucun utilisateur n'est inventé.
9. Entreprises non opérationnelles ignorées ; une panne sur une entreprise n'arrête pas les autres.

### Commission et frais au grand livre
10. **Écritures de ventilation sans effet sur le net** :
    - `COMMISSION` : PLATFORM CREDIT du montant de commission (déjà lu par les statistiques de la plateforme, qui attendaient ces écritures) contre un PLATFORM DEBIT de contrepartie. Le couple est équilibré et s'annule sur le compte PLATFORM : c'est une écriture de **ventilation**, la commission restant acquise via les écritures de vente existantes.
    - `FEE` : PROVIDER CREDIT du frais (le fournisseur retient son frais) contre PLATFORM DEBIT (charge de la plateforme). Conséquence voulue : la position nette PROVIDER devient brut − frais.
    - Une valeur nulle n'écrit rien. Les quatre écritures de vente d'origine et le net crédité sont **inchangés**.
11. **Compatibilité** : une vente d'avant l'étape n'a pas ces écritures. Le relevé range sa retenue (brut − net) dans « non ventilé » au lieu de l'attribuer à tort.
12. **Relevé de reversement ventilé** : les ventes couvertes sont celles dont la rétention s'est terminée entre la demande du reversement exécuté précédent (exclue) et la demande de ce reversement (incluse). Le PDF affiche brut, commission, frais à la charge de l'entreprise, non ventilé, net, reprises (remboursements, commissions hors plateforme), et rappelle que le montant reversé est le solde disponible à la date de la demande.
13. **Écran de solde** : endpoint `GET /business/wallet/breakdown` (ventilation cumulée). L'écran de l'entreprise ne l'affiche pas encore.
14. **Devise** : le grand livre utilise `payment.currency` (ventes et remboursements). Le calcul du solde (`getTenantBalance`) renvoie encore « XOF » (existant, non touché).
15. L'historique des transactions lit la commission isolée quand elle existe (sinon l'ancienne dérivation brut − net − frais, fausse quand la plateforme supporte les frais).

### Rapprochement
16. **Sondage toutes les 5 minutes** des paiements PENDING de plus de 2 minutes, via `ProcessWebhookUseCase.settlePending`, **le même point de transition que le webhook** (re-vérification serveur RG-06, mêmes événements). Le paiement est relu juste avant : un paiement déjà traité par un webhook est ignoré (idempotence).
17. **Expiration à 30 minutes** (FAILED, motif « expiré », champ `failureReason`, événement `payment.failed`) seulement si le fournisseur confirme « en attente » ou n'est plus configuré. **Fournisseur injoignable : jamais d'expiration** (état réel inconnu).
18. **Rejeu : seule la référence du paiement est conservée** au journal `webhook_events` (colonne `providerReference`, extraite après validation de la signature), **pas le corps du webhook** : le journal documentait volontairement qu'aucun contenu n'était stocké (données de paiement) et le serveur re-vérifie de toute façon auprès du fournisseur. Écart assumé avec « re-traite le payload stocké ».
19. **Rejouables** : issues ERROR et UNKNOWN_REFERENCE non résolues avec référence conservée. Jamais PROCESSED, DUPLICATE ni INVALID_SIGNATURE. Les webhooks reçus avant cette étape n'ont pas de référence : non rejouables. Un rejeu qui aboutit (traité ou déjà traité) marque le webhook résolu ; un paiement toujours inconnu le laisse à traiter. Action Admin authentifiée (`payments.reconcile`), auditée (`payment.webhook-replayed`).
20. **Doublon suspect** : même entreprise, même apprenant, même formation, même montant, même devise, chaque paiement à 10 minutes ou moins du précédent (exactement 10 minutes : suspect), paiements encaissés des 7 derniers jours. Le premier est l'original, jamais proposé au remboursement. **Le serveur recalcule les doublons** avant de rembourser : on ne peut rembourser que le paiement signalé (permission `payments.refund`, cas d'usage de remboursement existant). Une fois remboursé il sort des candidats : un second appel ne rembourse pas deux fois.
21. **Correction d'un défaut existant** : le webhook cherchait le paiement avec le code du fournisseur alors que `Payment.providerId` référence la configuration (UUID) : en conditions réelles tout webhook donnait UNKNOWN_REFERENCE. `findByProviderReference` accepte maintenant un code ou un identifiant (reconnu par sa forme d'UUID).

### Éligibilité des remboursements
22. **Règle pure** `evaluateRefundEligibility` : achat ≤ 7 jours (exactement 7 jours : éligible) ET progression **strictement** < 20 % (exactement 20 % : non éligible, comparaison en entiers) ET aucune tentative de quiz/examen **soumise** ET aucun certificat.
23. **Progression** = leçons terminées (RG-08a) / leçons de la formation, toutes leçons confondues, obligatoires ou non. Formation sans leçon : progression nulle. Une tentative expirée sans soumission ne compte pas comme soumise (statuts SUBMITTED, PASSED, FAILED).
24. **Acceptation automatique à la création** : statut ACCEPTED, note « acceptation automatique : conditions de la politique remplies », `autoAccepted`, événement `refund-request.decided` (l'apprenant est prévenu) ; le propriétaire de l'entreprise reçoit toujours la notification de demande. L'Admin n'a plus qu'à exécuter.
25. **Décision à valider** : l'entreprise peut toujours refuser une demande **non éligible**, jamais une éligible (déjà acceptée, le refus est une transition invalide). L'entreprise ne peut donc pas non plus la réduire en remboursement partiel.
26. **Critères figés à la demande** (colonne `Refund.eligibility`) : la progression évolue ensuite. **Fail-closed** : si les données de la politique sont indisponibles, la demande suit le circuit manuel.
27. **Lecture inter-modules sans cycle de modules** : enrollments, assessments et certificates dépendent déjà (directement ou non) de payments. Importer leurs modules dans `PaymentsModule` aurait créé un cycle. Un adaptateur d'infrastructure résout leurs **façades** à l'usage via `ModuleRef` (contexte global). Compromis à valider (localisation de service plutôt qu'injection).

## Fichiers clés

**Backend**
- `modules/platform-settings/` (nouveau) : `domain/finance-settings.ts`, `application/finance-settings.use-cases.ts`, `presentation/admin-finance-settings.controller.ts`, `platform-settings.facade.ts`, `.events.ts`, `.module.ts`.
- `modules/wallets/` : `domain/sale-ledger-entries.ts` (ventilation), `domain/sales-breakdown.ts`, `domain/payout-schedule.ts`, `domain/payout-statement.ts` (fenêtre), `application/run-automatic-payouts.use-case.ts`, `request-payout.use-case.ts`, `record-sale-to-ledger.listener.ts`, `get-sales-breakdown.use-case.ts`, `retention-period.ts` (constantes remplacées par `computeAvailableAt`), `wallets.scheduler.ts`, `infrastructure/pdfkit-payout-statement-renderer.adapter.ts`, `ledger.prisma-repository.ts`.
- `modules/payments/` : `domain/payment-reconciliation.ts`, `domain/refund-eligibility.ts`, `application/reconciliation.use-cases.ts`, `process-webhook.use-case.ts` (`settlePending`, `expirePending`), `refund-requests.use-cases.ts`, `infrastructure/refund-eligibility-data.adapter.ts`, `reconciliation.prisma-repository.ts`, `presentation/admin-reconciliation.controller.ts`, `payments.scheduler.ts`.
- `modules/enrollments` (`getProgressSummary`), `modules/assessments` (`countSubmittedAttempts`), `modules/audit` (3 écouteurs), `modules/users/domain/default-platform-roles.ts`, `app.module.ts`, `prisma/schema.prisma`.

**Admin** : `features/finance-settings/`, `features/reconciliation/`, pages `app/(dashboard)/finance-settings` et `reconciliation`, entrées de navigation « Paramètres financiers » et « Rapprochement ».
**Entreprise** : `features/refunds/` (critères remplis / non remplis, mention d'acceptation automatique).

## Actions à mener hors du code

1. **Schéma** : `prisma db push` (table `platform_settings` ; colonnes `webhook_events.provider_reference` et `resolved_at`, `payments.failure_reason`, `refunds.eligibility` et `auto_accepted`). Toutes optionnelles ou avec défaut : sans perte.
2. **Permissions** : `pnpm db:backfill-roles` pour donner au Super Administrateur `finance-settings.manage` et `payments.reconcile`.
3. **Variables d'environnement** : aucune nouvelle. Les tâches planifiées utilisent le `ScheduleModule` déjà actif (une seule instance du backend doit porter les crons, sinon les passages sont doublés ; les gardes d'idempotence limitent les dégâts).
4. Choisir la fréquence de reversement dans l'écran (par défaut MANUAL : rien ne change tant que l'Admin n'agit pas).

## Tests existants modifiés (règle légitimement changée)

- `process-webhook-logging.spec.ts` : le journal reçoit désormais la référence du paiement en 3e argument ; attentes mises à jour (`"ref-1"`, `undefined` pour la signature invalide). Mocks du journal complétés des nouvelles méthodes.
- `process-webhook.use-case.spec.ts` : mock du journal complété (aucune attente changée).
- `refund-requests.use-cases.spec.ts` : `RequestRefundUseCase` reçoit une nouvelle dépendance (données de politique) ; un stub « jamais éligible » est injecté.
- `generate-payout-statement.use-case.spec.ts` : nouvelle dépendance (grand livre) et `listByTenant` ajoutés au montage.
- `request-payout.use-case.spec.ts` (écrit par l'autre lot) : montage complété (`hasOpenPayout`, façade des paramètres).

## Limites connues

- **Paiement expiré puis confirmé tardivement** : FAILED est terminal, un webhook de succès arrivé après l'expiration est ignoré (DUPLICATE) alors que l'argent peut avoir été prélevé. L'expiration n'a lieu que si le fournisseur confirme « en attente » après 30 minutes ; le cas reste à traiter à la main (remboursement). Pas de réactivation.
- **Aucun contrôle montant/devise** entre la vérification fournisseur et le paiement (existant, non traité ici).
- **Doublons** : le schéma impose une seule ligne de paiement par inscription (`enrollmentId` unique) et une inscription par apprenant et formation. La détection protège les données importées ou futures ; un double prélèvement réel chez le fournisseur apparaît plutôt comme webhook UNKNOWN_REFERENCE dans la même vue.
- **Reversement automatique** : tous les tenants sont parcourus à chaque vague (pas de pagination). Pas de notification propre à une demande automatique (la notification `payout.requested` existante s'applique).
- Date d'effet future des paramètres : supportée par le stockage, non proposée dans l'écran. Pas d'écran d'historique des changements (endpoint `GET /admin/finance-settings/history` disponible ; l'audit les liste aussi).
- L'écran de solde de l'entreprise n'affiche pas encore la ventilation (endpoint prêt). Le relevé PDF d'un reversement d'avant l'étape range tout en « non ventilé ».
- La progression compte toutes les leçons (obligatoires ou non) ; une règle différente est une décision de produit.
- Fournisseur Pixel Innov sans API de remboursement : l'exécution échoue toujours pour lui (existant), donc aussi pour un doublon.

## Vérification

**Faite**
- Backend : `tsc` sans erreur ; ESLint sans erreur ni nouvel avertissement ; `pnpm arch:check` sans violation ; suite complète 139 suites, 1228 tests verts.
- Nouveaux tests backend : bornes des paramètres (0/90 jours, seuil ≥ 0, valeurs non entières, énumérations inconnues), versionnement par date d'effet et repli sur le défaut, écriture refusée sans aucun effet partiel, valeur identique ignorée, cache, audit avec ancienne/nouvelle valeur, permission `finance-settings.manage` sur chaque route ; ventilation équilibrée (frais entreprise ou plateforme, net inchangé, vente + remboursement équilibrés, compatibilité anciennes ventes), relevé ventilé et fenêtre ; paramètres lus à l'usage par le listener (rétention, frais, devise du paiement, vente passée non recalculée) ; seuil des paramètres, demande unique, reversement automatique (MANUAL, jour hors vague, éligibles, ignorés par motif, idempotence, panne isolée) ; sondage (succès, échec, en attente, expiration à 30 min, webhook concurrent, fournisseur injoignable, erreur isolée) ; rejeu (traité, idempotent sans second crédit, référence toujours inconnue, non rejouables, 404) ; doublon réel contre achats légitimes distincts (montant, formation, apprenant, entreprise, devise, 10 minutes pile), remboursement refusé pour l'original ou un paiement non doublon ; éligibilité aux limites (7 jours pile, 20 % pile, 19,9 %, formation sans leçon, quiz, certificat), acceptation automatique, circuit manuel, fail-closed, refus d'une demande éligible impossible.
- Admin : `tsc`, ESLint OK, tests des schémas OK (bornes du formulaire, patch minimal). Entreprise : `tsc`, ESLint OK, 13 tests (critères, compatibilité des anciennes demandes).

**Non testé**
- Aucune exécution sur base réelle : `prisma db push`, requêtes Prisma (sondage, rapprochement, ventilation, `findByProviderReference` par code), crons réels.
- Démarrage de l'application Nest (injection de dépendances) : `ModuleRef` avec `strict: false` pour les trois façades, nouveaux modules et providers. Seuls les tests unitaires et `tsc` valident le câblage.
- Appels réels aux fournisseurs de paiement (vérification, remboursement), PDF vérifié seulement comme document valide (pas visuellement).
- Écrans Admin et entreprise dans un navigateur (aucun test de composant) ; accessibilité des listes de critères non auditée.
- Audit effectivement écrit en base pour les trois nouveaux événements (écouteurs non testés unitairement).
