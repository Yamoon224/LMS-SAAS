# Étape 14 — Acceptation des conditions par l'apprenant

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-41 (« versionnées avec acceptation tracée »). Termine ce que l'étape 13 avait laissé ouvert : la table et la route d'acceptation existaient, mais aucun écran ne les utilisait.

## Comportement

- Un apprenant **connecté** voit une fenêtre « Avant de continuer » tant que la version courante des documents obligatoires n'est pas acceptée : à la première connexion, et à chaque nouvelle version publiée par l'Admin.
- Documents obligatoires : **CGU** et **politique de confidentialité**. Les CGV restent lisibles (pied de page) mais ne bloquent pas l'accès, car elles s'appliquent à l'achat. Ce choix est une constante (`LEARNER_REQUIRED_TYPES`), facile à changer.
- La fenêtre n'est pas fermable. Elle propose les liens vers les textes (nouvel onglet), une case « J'ai lu et j'accepte », « Continuer », ou « Je refuse et je me déconnecte ». Elle est **masquée sur les pages `/legal`** pour permettre la lecture.

## Backend (`backend/src/modules/legal/`)

| Élément | Rôle |
| --- | --- |
| `GET /public/legal/pending` | Documents obligatoires dont la **version courante** n'est pas acceptée par l'apprenant connecté (type, version, titre). Déclaré avant `:type` pour ne pas être lu comme un type de document. |
| `POST /public/legal/:type/accept` | Prend maintenant `{ version }` : l'acceptation n'est enregistrée que si cette version est toujours la version courante. Sinon erreur `VERSION_DOCUMENT_LEGAL_PERIMEE` et **rien n'est enregistré** : un apprenant ne peut pas valider un texte qu'il n'a pas vu. |
| `pendingForUser`, `ListPendingLegalDocumentsUseCase` | Règle pure et cas d'usage. L'acceptation de la v1 ne dispense pas d'accepter la v2. |
| `findAcceptedDocumentIds` | Nouvelle lecture du port de persistance. |

## Front apprenant (`learning/features/legal/`)

`LegalAcceptanceGate` (inséré dans la mise en page du site, sans effet pour un visiteur non connecté), hook et API d'acceptation, schéma de réponse, textes propres à la feature. Rôle : `role="dialog"`, `aria-modal`, focus sur le titre à l'ouverture, cibles de 44 px. Si une version change pendant l'acceptation, un message l'indique et la liste est relue pour présenter le nouveau texte.

## Limites connues

- Le parcours d'inscription ne demande pas l'acceptation : elle est demandée **à la première connexion** (le compte n'existe pas avant l'activation, donc rien ne peut être tracé plus tôt).
- Seuls les apprenants sont concernés. Les utilisateurs d'entreprise et les administrateurs n'ont pas d'écran d'acceptation.
- Une erreur de chargement de la liste (API injoignable) n'affiche pas la fenêtre : l'accès n'est pas bloqué dans ce cas. À durcir si l'acceptation devient une exigence juridique stricte côté serveur (aujourd'hui rien n'empêche d'appeler les autres routes sans avoir accepté).
- Pas d'export du journal des acceptations (seul le compteur par version existe côté Admin).

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, 81 suites / 515 tests OK. Nouveaux tests : version obsolète refusée sans écriture, liste des documents en attente (CGU et confidentialité seulement, jamais les CGV, déduction des versions déjà acceptées, liste vide).
- Learning : `tsc` et ESLint OK (pas de tests dans cette app).
- **Non testé** : la fenêtre dans un navigateur (focus, clavier, lecteur d'écran), l'exécution des requêtes sur une vraie base.
