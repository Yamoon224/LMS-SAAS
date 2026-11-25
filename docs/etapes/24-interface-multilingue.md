# Étape 24 — Interface apprenant en huit langues (RTL compris)

**Date** : 2026-11-17
**Référence cahier des charges** : PUB-15 — « L'interface est disponible dans les langues activées par la plateforme » ; arabe en droite-à-gauche via les propriétés CSS logiques (sections 7 et 13).

## Choix de conception (pris sans consultation, à valider)

1. **Périmètre : l'application apprenant (`learning`)**. Les back-offices Admin et Entreprise restent en français (le cahier ne demande des langues que pour la plateforme publique).
2. **Pas de bibliothèque i18n** : un dictionnaire typé par langue. Le français (`learning/src/lib/i18n/dictionaries/fr.ts`) est la source de vérité ; chaque autre langue est typée `Copy`, donc **le compilateur refuse une clé manquante ou en trop**.
3. **Langue choisie = cookie `learning_locale`** > langue du navigateur (`Accept-Language`) > français. Seules les langues **activées par l'Admin** (étape 16, `GET /public/languages`) sont retenues ; le français l'est toujours. Si ce service est injoignable, toutes les langues sont supposées disponibles plutôt que de bloquer l'interface.
4. **Les huit dictionnaires sont dans le JavaScript client** (pas de chargement à la demande) : le dictionnaire contient des fonctions (pluriels), non sérialisables du serveur vers le client, et seule la langue (une chaîne) traverse la frontière. Coût mesuré au build : 102 kB de JS partagé au total ; à réexaminer si le poids devient un enjeu (PUB-16).
5. **Un seul dictionnaire** : l'ancien `copy.ts` et les textes propres aux features (profil, achats, remboursement, légal, lecteur) ont été fusionnés ; `src/locales/` (stub de 3 langues, non utilisé) est supprimé.

## Ce qui a été fait

- **Infrastructure** (`learning/src/lib/i18n/`) : `locales.ts` (langues, noms natifs, étiquettes `Intl`, sens d'écriture, résolution pure et testée), `server.ts` (`getLocale`, `getCopy`, langues activées), `client.tsx` (`I18nProvider`, `useCopy`, `useLocale`), dictionnaires `fr`, `en`, `es`, `de`, `ar`, `zh`, `ru`, `tr`.
- **Racine** : `<html lang dir>` suit la langue (`dir="rtl"` pour l'arabe) ; titres et descriptions de page localisés.
- **Sélecteur de langue** dans l'en-tête et les pages de connexion ; le choix est mémorisé un an. La langue préférée du profil, une fois enregistrée, met aussi à jour la langue de l'interface.
- **Tous les écrans migrés** (pages, formulaires, validations, évaluations, lecteur, achats, profil, légal, notifications). Les schémas de validation sont devenus des fabriques recevant le dictionnaire.
- **Formats** : dates, heures, nombres et temps relatifs suivent la langue (`Intl`) ; prix et durées utilisent les libellés du dictionnaire.
- **Langue des e-mails et notifications** : l'inscription et l'inscription à une formation envoient la langue courante au lieu de `"fr"` en dur.
- **RTL** : classes Tailwind physiques (`ml-`, `pr-`, `text-left`, `left-`…) remplacées par les équivalents logiques (`ms-`, `pe-`, `text-start`, `start-`…) ; flèches et chevrons retournés en RTL.
- **Messages d'erreur** : session expirée, service injoignable et échecs de chargement sont localisés, y compris hors React (`api-client`, `server-api`).

## Tests

18 nouveaux tests dans learning : résolution de la langue (cookie, `Accept-Language`, langues activées, valeur de cookie hostile), sens d'écriture, **complétude de chaque dictionnaire** (mêmes clés et mêmes natures texte/fonction que le français, au moins 85 % de textes différents, aucun texte vide, fonctions de pluriel contenant leurs nombres). 63 tests au total. `tsc`, ESLint, `arch:check` et **`next build` de production** passent.

## Limites connues (à lire)

- **Traductions non relues par des locuteurs natifs.** Elles ont été produites par IA, une langue par agent, avec les contrôles automatiques ci-dessus (qui vérifient la forme, pas la justesse). Faire relire au moins l'arabe, le russe, le turc et le chinois avant la mise en production. Choix relevés : espagnol en « usted », « formation » traduit par « curso », arabe écrit en chiffres latins, turc reformulé pour éviter les suffixes après une variable.
- **Les messages d'erreur métier du backend restent en français** (« Paiement refusé… », motifs de refus, messages de validation serveur) : ils s'affichent tels quels. Les localiser demande un catalogue par code d'erreur côté interface (le backend fournit déjà un `code` stable).
- **Contenu venant des entreprises** (titres, descriptions, pages légales, textes de notifications saisis par l'Admin) : non traduit ici ; les formations ont leur propre traduction (étape 19).
- **Le lecteur de la barre mobile** n'a pas de sélecteur de langue (en-tête uniquement).
- **Jamais vérifié dans un navigateur** : rendu RTL (alignements, icônes), polices couvrant l'arabe et le chinois (la police actuelle est latine : repli sur la police système), longueur des textes allemands et russes dans les boutons.
- Les routes `src/app/api/**` (proxy) conservent des messages français techniques ; le client les remplace par un texte localisé selon le statut HTTP, sauf quand le backend fournit un code métier.
- Le cookie de langue n'est pas rattaché au compte : changer d'appareil redonne la langue du navigateur.
