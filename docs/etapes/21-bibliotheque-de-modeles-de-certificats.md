# Étape 21 — Bibliothèque de modèles de certificats

**Date** : 2026-11-17
**Référence cahier des charges** : ADM-39 — « bibliothèque de modèles proposés aux entreprises (mise en page, polices, couleurs) ».

## Choix de conception (pris sans consultation, à valider)

1. **Une entreprise reçoit une COPIE**, pas un lien vers le modèle de la bibliothèque. Modifier, retirer ou supprimer ensuite un modèle de la bibliothèque ne change donc jamais l'apparence des certificats déjà émis, ni les modèles des entreprises.
2. **Un modèle est un brouillon à sa création** : il est prévisualisé puis publié par l'Admin. Un brouillon est **invisible et non installable** par les entreprises (traité comme inexistant, pour qu'elles ne puissent pas le deviner par son identifiant).
3. **Seuls les réglages que le rendu applique réellement sont proposés** : police, couleurs, orientation, bordure (voir le constat ci-dessous).
4. **Les polices sont les trois polices PDF standard** (sans empattement, avec empattements, machine à écrire) : aucune police à embarquer ni à licencier.

## Constat sur l'existant : le rendu ignorait presque tout le design

Le moteur de rendu des certificats **n'appliquait que `primaryColor`**, sans aucune validation : une valeur arbitraire était transmise telle quelle à PDFKit. Logo, insigne, signature et image de fond du design étaient acceptés mais jamais dessinés. Une bibliothèque « mise en page, polices, couleurs » n'aurait donc eu aucun effet. Il a fallu faire du design une donnée typée, validée, et réellement appliquée :

- **`certificate-design.ts`** (fonctions pures) : types, listes autorisées, `resolveDesign` (valeurs par défaut ; **jamais de valeur libre transmise au moteur PDF** : couleur ou choix invalide → valeur par défaut), `validateDesign` (liste tous les problèmes), mesure de contraste et avertissements de lisibilité (non bloquants).
- **Rendu PDF** : applique la police, les trois couleurs, l'orientation (paysage ou portrait) et la bordure (aucune, simple, double). Les tests lisent directement le PDF produit : taille de page et police embarquée.
- **Modèles propres à une entreprise** : les mêmes réglages (et la même validation `#RRGGBB`) sont désormais acceptés par la route existante de création, qui n'imposait aucun format de couleur. Les anciens modèles (seulement `primaryColor`, éventuellement saisi librement) restent lisibles : une couleur invalide retombe sur la valeur par défaut au lieu de faire échouer l'émission.

## Backend (`backend/src/modules/certificates/`)

| Élément | Rôle |
| --- | --- |
| `domain/certificate-design.ts`, `domain/certificate-library.ts` (+ specs) | Design, validation, contraste, nom normalisé, données d'aperçu fictives. |
| `application/certificate-library.use-cases.ts` (+ spec) | Gérer (créer, modifier, publier, retirer, supprimer), prévisualiser, lister les modèles publiés, installer une copie. |
| `infrastructure/certificate-library.prisma-repository.ts`, `pdfkit-certificate-renderer.adapter.ts` | Persistance ; rendu appliquant le design. |
| `presentation/admin-certificate-library.controller.ts` | `GET/POST /admin/certificate-library`, `PUT/DELETE …/:id`, `POST …/:id/publish` et `/unpublish`, `POST …/preview` (permission `certificate-library.manage`). |
| `presentation/business-certificate-library.controller.ts` | `GET /business/certificate-library` (publiés), `GET …/:id/preview`, `POST …/:id/install` (permission `certificates.manage`, copie créée **dans l'entreprise de l'appelant**). |

Règles testées : nom unique sans tenir compte de la casse ni des espaces (un modèle peut garder son nom), design invalide refusé sans écriture, brouillon non listé / non aperçu / non installable, copie **indépendante** du modèle d'origine, « par défaut » retire d'abord l'ancien modèle par défaut **de cette entreprise seulement**, aperçu avec **données fictives** (jamais d'apprenant ni de numéro réels).

### Modèle de données et permission — à appliquer

- `prisma/schema.prisma` : table `certificate_library_templates` → `prisma db push` (client déjà régénéré).
- Nouvelle permission plateforme **`certificate-library.manage`** → `pnpm db:backfill-roles`.

## Fronts (chacun autonome)

- **Admin** (`features/certificate-library/`, page `/certificate-library`) : cartes avec pastilles de couleur, police, orientation, bordure, état et **avertissements de lisibilité** ; formulaire de création et de modification avec **aperçu PDF intégré avant enregistrement** (l'aperçu en cours est remplacé proprement et l'URL du fichier libérée) ; publier, retirer, supprimer avec confirmation.
- **Entreprise** (`features/certificates/`, onglet « Bibliothèque ») : modèles publiés, aperçu intégré, « Utiliser ce modèle » avec option « définir par défaut », et rappel que c'est une copie.
- **Le relais Next.js de l'Admin décodait toutes les réponses en texte** : un PDF aurait été corrompu. Il relaie maintenant le binaire `application/pdf` (même correctif que côté Entreprise à l'étape 03).

## Limites connues

- **Logo, insigne, signature et image de fond** ne sont pas rendus (ni pour la bibliothèque, ni pour les modèles d'entreprise) : ce n'est pas nouveau, mais c'est ce que « mise en page » recouvre le plus naturellement pour une entreprise. À traiter séparément (téléversement et sécurité des images).
- **Alphabets non latins** : les polices PDF standard ne couvrent pas l'arabe, le chinois, le russe ni le turc complet ; le nom d'un apprenant dans ces alphabets s'afficherait mal. Il faudrait embarquer des polices dédiées.
- Pas de duplication d'un modèle dans l'écran Admin, ni de réorganisation de l'ordre d'affichage (tri par nom côté entreprise).
- Installer deux fois le même modèle crée deux copies.
- Les textes du certificat (« Certificat de réussite », « décerné à »…) sont en français et non modifiables.

## Vérification

- Backend : `tsc` OK, ESLint sans nouvel avertissement, `arch:check` sans violation, test de couverture des permissions OK, 100 suites / 711 tests OK (50 nouveaux : design et validation, rendu réel du PDF, cas d'usage de la bibliothèque).
- Admin : `tsc`, ESLint OK, 46 tests OK (11 nouveaux). Business : `tsc`, ESLint OK, 27 tests OK.
- **Non testé** : exécution des requêtes sur une vraie base, affichage de l'aperçu PDF dans le navigateur (cadre intégré, selon le visionneur PDF du navigateur), parcours d'installation de bout en bout.
