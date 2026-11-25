# Étape 37 — Polices arabe et chinoise, sens RTL (écran et PDF)

**Date** : 2026-11-19
**Référence cahier des charges** : PUB-15 (langues de l'interface, dont l'arabe en écriture de droite à gauche) ; certificats multilingues (12.4) ; rapport de conformité §10 point 6.

## Écran (app `learning`)

| Point | Réalisation |
| --- | --- |
| Sens | `layout.tsx` rend déjà `<html lang dir>` via `textDirection(locale)` : `dir="rtl"` pour `ar`. Les composants utilisaient déjà les propriétés logiques (`ms-/me-/ps-/pe-/start-/end-`) et `rtl:rotate-180` pour les flèches (←, →, `ArrowLeft/Right`) : aucune refonte nécessaire. |
| Polices | `next/font/google` : **Noto Sans Arabic** (`--font-arabic`) pour `ar`, **Noto Sans SC** (`--font-chinese`) pour `zh`, **Inter** cyrillique + latin étendu (`--font-sans-ext`) pour `ru` et `tr` (Inter latin seul ne contient ni cyrillique ni ğ ş İ). `display: swap`, `preload: false` : aucun `<link rel="preload">` ; le navigateur ne télécharge que les tranches `unicode-range` utilisées. |
| Chargement conditionnel | La classe `variable` d'une police n'est posée sur `<html>` que pour sa langue (`SCRIPT_FONT_CLASS`) : le CSS `@font-face` des autres langues n'est pas émis. |
| Repli | `globals.css` : pile par langue (`html[lang="ar"] body`, `zh`, `ru`/`tr`) avec polices système (Segoe UI, Tahoma, PingFang SC, Microsoft YaHei, Noto Sans CJK SC…). En arabe : `letter-spacing: normal !important` (l'espacement des lettres casse les liaisons) et interligne 1,65. |
| Correctif | Pages d'authentification : le sélecteur de langue était en `absolute` et recouvrait le nom du tenant à 390 px ; il est maintenant dans le flux (`(auth)/layout.tsx`). |
| Sélecteur | Inchangé : cookie `learning_locale` (1 an) + `router.refresh()` ; `?lang=xx` (middleware) mémorise aussi la langue. Vérifié : persistance après navigation et rechargement, bascule `ar` ↔ `zh` ↔ `fr`. |

## PDF (backend)

pdfkit n'embarque que les polices standard (WinAnsi). Module **`backend/src/shared/pdf/fonts/`** :

| Fichier | Rôle |
| --- | --- |
| `font-selection.ts` | Fonctions pures : `detectScript` (standard / arabe / chinois / autre alphabet), `pickFontName` (famille Noto + graisse déduite de la police standard demandée, `null` si la police standard suffit). |
| `font-files.ts` | Localise `assets/fonts` (src, `dist/assets/fonts`, `PDF_FONTS_DIR`), lit chaque police une fois par processus. |
| `bidi.ts` | Réordonnancement bidirectionnel simplifié (voir limites). |
| `unicode-text.ts` | `enableUnicodeText(doc)` : surcharge, sur l'instance du document, `font`, `text`, `widthOfString` et `heightOfString`. Les renderers gardent leur code : ils appellent `doc.font("Helvetica-Bold").text(...)` comme avant. |

Fonctionnement : pour chaque chaîne, si tous ses caractères sont dans WinAnsi, la police standard est utilisée (**aucun changement pour fr/en/es/de**, aucune police Noto embarquée). Sinon la police Noto correspondante (même graisse) est utilisée le temps de l'appel, puis la police standard est restaurée. Arabe : **fontkit** (dépendance de pdfkit, polices TTF) applique la mise en forme contextuelle OpenType (formes initiale/médiane/finale, ligatures lam-alef) et l'ordre RTL au sein d'un run arabe ; `bidi.ts` ordonne les runs d'une ligne (mots latins, nombres, pourcentages, parenthèses), fait le retour à la ligne et l'alignement. Chinois : pdfkit coupe les lignes selon UAX #14 (césures entre idéogrammes).

Appliqué à : certificats (`pdfkit-certificate-renderer`), attestations de suivi (`pdfkit-attestation-renderer`), factures (`pdfkit-invoice-renderer`) et relevés de reversement (`pdfkit-payout-statement-renderer`) — les noms d'apprenants, titres de formation, raisons sociales, signataires et pieds de page peuvent donc être en arabe, chinois, cyrillique ou turc.

### Langues des certificats et attestations

- `CERTIFICATE_LANGUAGES` : `FR`, `EN` + **`AR`, `ZH`, `RU`, `TR`** (titre, formules, date : `ar-u-nu-latn`, `zh-CN`, `ru-RU`, `tr-TR`). Le DTO accepte les nouvelles valeurs (même constante) ; le formulaire de design de l'app business propose les six langues (le fichier `CertificatePreview.tsx`, copié à l'identique côté admin, a été complété côté business seulement : l'admin garde FR/EN).
- Attestation : langue déduite de `locale` (`fr`, `en`, `ar`, `zh`, `ru`, `tr`), repli français.

### Polices embarquées (`backend/assets/fonts/`)

Sous-ensembles **statiques** générés à partir des polices variables officielles de Google Fonts (`github.com/google/fonts`, `ofl/`) avec fontTools (instances Regular 400 et Bold 700, hinting retiré, fonctionnalités OpenType conservées). Licence **SIL OFL 1.1** (`OFL-NotoSans*.txt` à côté des fichiers).

| Fichier | Contenu | Taille |
| --- | --- | --- |
| `NotoSans-Regular/Bold.ttf` | Latin, latin étendu (turc), grec, cyrillique, ponctuation | 2 × 155 Ko |
| `NotoSansArabic-Regular/Bold.ttf` | Arabe (+ supplément, formes de présentation A/B) + latin de base | 2 × 140 Ko |
| `NotoSansSC-Regular/Bold.ttf` | Hanzi **GB2312** (≈ 6 760 caractères), ponctuation CJK, formes pleine largeur, latin de base | 2 × 2,4 Mo |
| **Total** | | **≈ 5,3 Mo** |

Le PDF final n'embarque que les glyphes utilisés (pdfkit sous-ensemble à la sortie : un certificat arabe ≈ 40 Ko, chinois ≈ 30 Ko). `nest-cli.json` copie `assets/fonts/*.ttf` dans `dist/assets/fonts` ; le `Dockerfile.backend` copie aussi `backend/assets` dans l'image. Régénération : voir le script décrit ci-dessus (instancier `wght`, `wdth=100`, sous-ensemble Unicode).

## Tests

- `font-selection.spec.ts` : détection de script, famille et graisse, aucune régression pour le latin.
- `bidi.spec.ts` : runs RTL/LTR, nombres, pourcentages, parenthèses (miroir et appariement).
- `unicode-text.spec.ts` : PDF avec texte arabe (gras et normal, latin et chiffres mêlés), chinois, russe, turc : généré sans erreur, polices Noto présentes (`/FontName …+NotoSansArabic-Bold`, etc.) ; latin sans aucune police Noto ; restauration de la police ; `widthOfString` / `heightOfString` / ellipse.
- `pdfkit-certificate-renderer.adapter.spec.ts` : certificats AR, ZH, RU, TR complets ; FR reste en Helvetica.
- Contrôle visuel (rendu PDF -> image) : certificats arabe (formes liées, sens RTL, `(Ahmed)`, `Excel`, `88%` corrects) et chinois.

## Limites connues

1. **Une seule police par chaîne.** Une chaîne contenant de l'arabe utilise Noto Sans Arabic (latin de base et chiffres inclus) : un mot cyrillique ou chinois au milieu d'une phrase arabe, ou un mélange chinois + arabe, affichera des glyphes manquants (□). Idem pour un nom chinois contenant du cyrillique : Noto Sans SC n'a pas le cyrillique.
2. **Bidi simplifié** (voir `bidi.ts`) : deux niveaux seulement ; pas d'embeddings/overrides explicites (LRE, RLO, isolats), pas de gestion fine des nombres arabo-indiques composés, parenthèses appariées sans imbrication complexe, ponctuation finale ambiguë résolue selon le sens du paragraphe. Le sens du paragraphe est celui du premier caractère fort. Cas courants (nom arabe + mot latin, nombres, %, parenthèses) vérifiés ; textes très mêlés à relire.
3. **Alignement par défaut `left`** (comme pdfkit) : les renderers passent déjà `align: "center"` pour les certificats. Une facture française contenant un nom arabe reste donc alignée à gauche.
4. **Mise en page non miroitée** : un certificat arabe garde la position du logo, de l'insigne, du QR code et des signataires du design ; seule la direction du texte est inversée. Le choix de l'orientation de la mise en page est laissé au design (position du logo).
5. **Chinois** : jeu GB2312 (caractères courants simplifiés). Les caractères rares ou traditionnels hors GB2312 (noms propres) s'affichent en □ ; il suffit de régénérer le sous-ensemble avec Big5 / GB18030 (+ ≈ 1–2 Mo). Pas de gras synthétique : le gras utilise l'instance Bold 700.
6. **Polices serif/monospace** : `TIMES` et `COURIER` n'ont pas d'équivalent Noto embarqué ; les textes non latins y sont rendus en Noto Sans (sans empattement).
7. **Écran** : les polices Google sont téléchargées au build/dev par `next/font` (réseau requis) ; hors ligne, le repli système s'applique. Le back-office FR (`business`) n'est pas concerné (hors périmètre, non demandé), ni `admin`.
