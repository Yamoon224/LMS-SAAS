# Étape 03 — Historique des paiements et factures PDF (Entreprise)

**Date** : 2026-11-17
**Référence cahier des charges** : section 6.1 — ENT-05 (factures). ENT-06 (achat de packs de crédits IA) était déjà couvert par `business/features/ai-translation` (`BuyCreditPackDialog`) et `POST /business/ai-translation/wallet/purchase`.

## Backend (`backend/src/modules/payments/`)

| Fichier | Rôle |
| --- | --- |
| `domain/invoice.ts` | Type `Invoice`, statuts facturables (`SUCCEEDED`, `REFUNDED`, `PARTIALLY_REFUNDED`), types facturables (`SUBSCRIPTION`, `CREDIT_PURCHASE`), `buildInvoiceNumber` → `FAC-AAAAMM-XXXXXXXX` (dérivé de l'id du paiement : stable, aucun compteur à synchroniser). |
| `domain/invoice-pdf-renderer.port.ts` | Port de rendu PDF. |
| `infrastructure/pdfkit-invoice-renderer.adapter.ts` | Adaptateur PDFKit (A4 : numéro, date, client, ligne, total, statut, moyen de paiement). |
| `domain/payment.repository.port.ts` + `infrastructure/payment.prisma-repository.ts` | `listInvoices(tenantId)` et `findInvoice(tenantId, paymentId)` ; la description est construite depuis le plan/périodicité ou le pack de crédits. |
| `application/list-invoices.use-case.ts`, `generate-invoice-pdf.use-case.ts` | Cas d'usage ; le nom du client vient de `TenantsFacade` (pas d'accès aux internes du module tenants). |
| `presentation/business-billing.controller.ts` | `GET /business/billing/invoices` et `GET /business/billing/invoices/:paymentId/pdf` (permission `subscriptions.manage`, accessibles même sans abonnement valide). |

Isolation : les requêtes filtrent toujours par `tenantId` ; une facture d'une autre entreprise renvoie 404. Les ventes de formations (`COURSE_ENROLLMENT`) ne sont pas facturées à l'entreprise.

## Front Entreprise (`business/`)

- `features/subscription/components/InvoiceHistory.tsx` : tableau (date, facture, description, montant, statut, bouton PDF), recherche, tri, export, état vide. Ajouté à la page `/subscription`.
- Schémas, API et hook ajoutés dans la feature `subscription` existante.
- **Correction du proxy** `app/api/backend/[...path]/route.ts` : il décodait toutes les réponses en texte, ce qui aurait corrompu un PDF. Les réponses `application/pdf` sont désormais relayées en binaire avec leur `Content-Disposition`.

## Limites connues

- L'adresse e-mail du client n'est pas imprimée (non exposée par `TenantsFacade`) ; pas de TVA ni d'informations légales de l'émetteur : à définir avec le client (point à clarifier du cahier des charges).
- Le numéro de facture n'est pas séquentiel légal ; à revoir si une numérotation continue est exigée.

## Vérification

- Backend : `tsc` OK, ESLint 0 erreur, `arch:check` sans violation, 67 suites / 428 tests OK (nouveaux : numéro de facture, rendu PDF `%PDF-`). Une exécution complète a signalé une suite en échec sans que je l'aie diagnostiquée ; deux relances complètes suivantes sont entièrement vertes.
- Business : `tsc` OK, ESLint OK, 27 tests OK.
- Non testé de bout en bout (base de données et navigateur) : le téléchargement réel via le proxy reste à valider manuellement.
