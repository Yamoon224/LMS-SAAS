# Registre des traitements de données à caractère personnel

**Statut : projet technique à faire valider par un juriste** (loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel ; démarches auprès de l'ARTCI, autorité de protection). Les finalités, bases légales et durées ci-dessous décrivent ce que **le code fait réellement** ; elles ne constituent pas un avis juridique. Dernière mise à jour : 2026-11-18 (étape 28).

**Responsabilités**. L'**entreprise cliente** (le tenant) détermine pourquoi elle forme ses apprenants : elle est en pratique responsable de traitement pour les données de ses apprenants. L'**exploitant de la plateforme** agit comme sous-traitant pour ce volet et comme responsable de traitement pour les comptes entreprise, la facturation SaaS et la sécurité. Cette répartition est à confirmer (contrat de sous-traitance à prévoir entre l'exploitant et chaque entreprise).

## 1. Traitements

| # | Traitement | Finalité | Personnes | Catégories de données | Base légale (à valider) | Durée de conservation | Destinataires |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Compte apprenant | Créer et gérer l'accès à la plateforme de formation | Apprenants | Nom, prénom, e-mail, téléphone (facultatif), langue, mot de passe (haché Argon2), secret 2FA le cas échéant, dates de création/connexion | Exécution du contrat (CGU) | Durée du compte ; **anonymisation après 36 mois d'inactivité** ou à la demande de l'apprenant | Entreprise cliente (responsable de formation), exploitant |
| T2 | Inscriptions, progression et résultats | Délivrer la formation, suivre l'avancement, évaluer | Apprenants | Inscriptions, statut, progression par leçon, tentatives de quiz/examens (réponses, notes) | Exécution du contrat | Durée de la relation ; conservés **sans identité** après anonymisation du compte (statistiques de l'entreprise) | Entreprise cliente |
| T3 | Certificats | Attester la réussite ; vérification publique par numéro | Apprenants | Nom du titulaire (figé à la délivrance), formation, score, numéro, dates | Exécution du contrat ; intérêt légitime de l'entreprise (valeur probante du certificat) | Illimitée pour le numéro et la validité ; **le nom est remplacé par « Compte supprimé »** si le compte est supprimé (le PDF déjà émis n'est pas réécrit) | Tout détenteur du numéro (vérification publique) |
| T4 | Paiements et facturation | Encaisser, rembourser, tenir la comptabilité | Apprenants, entreprises | Montant, moyen de paiement, référence du prestataire, statut, remboursements ; charge brute des événements du prestataire | Obligation légale (comptabilité) ; exécution du contrat | **Durée légale de conservation comptable (à confirmer par le juriste ; 10 ans en pratique)** ; jamais purgés par la tâche de conservation | Prestataires de paiement, entreprise cliente, exploitant |
| T5 | Grand livre et reversements | Répartir les revenus (commission, reversement à l'entreprise) | Entreprises | Écritures comptables, coordonnées de reversement | Obligation légale ; exécution du contrat | Durée légale comptable | Exploitant, entreprise cliente |
| T6 | Acceptation des conditions légales | Prouver le consentement aux CGU/CGV/politique de confidentialité | Tous utilisateurs | Identifiant interne, version du document, date | Obligation de preuve ; intérêt légitime | Durée de la relation ; conservées **sans identité** après anonymisation (preuve de consentement) | Exploitant |
| T7 | Notifications (e-mail, SMS, in-app) | Informer l'utilisateur (activation, paiement, rappels, certificat) | Tous utilisateurs | Destinataire, canal, modèle, variables injectées (nom, liens, montants), statut d'envoi | Exécution du contrat | **Notifications lues : suppression après 12 mois** ; toutes supprimées à la suppression du compte | Fournisseurs d'e-mail et de SMS |
| T8 | Sessions et sécurité | Authentifier, prévenir l'abus | Tous utilisateurs | Jetons de rafraîchissement (hachés), journaux techniques, adresse IP et agent utilisateur dans le journal d'audit | Intérêt légitime (sécurité) | Jetons : jusqu'à expiration/révocation ; journal d'audit : durée à fixer (non purgé automatiquement) | Exploitant |
| T9 | Journal d'audit | Tracer les actions sensibles (RG-19) | Utilisateurs d'entreprise, administrateurs | Action, objet, auteur, date, IP, agent utilisateur | Intérêt légitime ; obligation de sécurité | **Non purgé automatiquement** (voir limites) | Entreprise (son périmètre), exploitant |
| T10 | Médias de formation | Héberger les supports (vidéo, PDF, audio, images) | Formateurs/entreprises | Fichiers téléversés, nom d'origine ; analyse antivirus à la réception | Exécution du contrat | Tant que la formation existe ; un fichier refusé par l'antivirus est supprimé aussitôt | Hébergeur de stockage, CDN |
| T11 | Sessions en direct | Planifier et suivre la présence | Apprenants, formateurs | Titre, horaires, présence (arrivée/départ) | Exécution du contrat | Durée de la relation | Fournisseur de visioconférence/agenda |
| T12 | Traduction automatique de contenu | Traduire les formations | Aucune donnée d'apprenant (contenu de formation) | Textes de formation | Intérêt légitime | Selon le prestataire | Prestataire de traduction |

## 2. Droits des personnes : mise en œuvre

| Droit | Mise en œuvre |
| --- | --- |
| Accès / portabilité | `GET /public/me/data-export` (profil, inscriptions, progression, résultats, certificats, achats, acceptations légales, présences, notifications — **sans** contenu des notifications, haché de mot de passe, secrets ni charges brutes des prestataires). Écran : Profil > « Mes données ». Débit limité (3 par minute). Chaque export est tracé au journal d'audit (nombres d'éléments uniquement). |
| Effacement | `POST /public/me/delete-account` avec mot de passe : **anonymisation irréversible** (nom, e-mail, téléphone remplacés ; mot de passe et secret 2FA effacés ; sessions révoquées ; jetons d'activation et notifications supprimés). Refusée avec motif tant qu'un paiement est en attente ou qu'un remboursement n'est pas résolu. Tracée au journal d'audit. Écran : Profil > « Mes données ». |
| Rectification | Profil apprenant (nom, téléphone, langue) ; l'e-mail est l'identifiant de connexion (changement non prévu : à traiter via le support). |
| Opposition / limitation | Non automatisé : à traiter via le support de l'exploitant (à définir). |
| Information | Pages légales versionnées (ADM-41), acceptation tracée (T6). La mention du présent registre et des durées dans la politique de confidentialité reste à rédiger. |

## 3. Durées de conservation automatiques

Tâche planifiée quotidienne (03 h 30 UTC), module `privacy` :

- notifications **lues** depuis plus de **12 mois** : supprimées ;
- comptes apprenants **sans activité depuis 36 mois** (aucune connexion ni session, aucune inscription modifiée) : anonymisés comme à une demande de suppression, sauf paiement/remboursement en cours (repris à l'exécution suivante) ;
- désactivable avec `RETENTION_PURGE_ENABLED=false`.

Les durées sont des constantes (`backend/src/modules/privacy/domain/privacy-policy.ts`) : toute modification doit être répercutée ici.

## 4. Sous-traitants et transferts

| Sous-traitant | Rôle | Données concernées | Localisation / garanties |
| --- | --- | --- | --- |
| AWS S3, CloudFront, MediaConvert (ou MinIO en développement) | Stockage et diffusion des médias, transcodage vidéo, certificats PDF | Médias de formation, PDF de certificats (contiennent le nom du titulaire) | Région configurable (`eu-west-3` par défaut) — **à confirmer** ; clauses contractuelles AWS à vérifier |
| Paystack, Pixel Innov (fournisseurs de paiement paramétrables) | Encaissement des paiements en ligne | Montant, moyen de paiement, référence, e-mail/téléphone selon le fournisseur | Selon le fournisseur — **à documenter** pour chaque fournisseur activé |
| Serveur SMTP / fournisseur d'e-mail | Envoi des e-mails transactionnels | E-mail, nom, contenu du message | **À documenter** (fournisseur de production non fixé) |
| Fournisseur de SMS | Envoi de SMS | Téléphone, contenu du message | **À documenter** (fournisseur non fixé) |
| Fournisseur de traduction (DeepL ou autre, `AI_TRANSLATION_PROVIDER`) | Traduction du contenu de formation | Textes de formation uniquement | Selon le fournisseur ; à vérifier que les contenus ne contiennent pas de données personnelles |
| Google (Agenda/Meet, OAuth) | Sessions en direct | Titres et horaires de sessions, comptes de l'organisateur | Hors Côte d'Ivoire : transfert à encadrer |
| Sentry (si `SENTRY_DSN` renseigné) | Supervision des erreurs | Traces techniques, risque de données personnelles dans les messages d'erreur | **À documenter** |
| ClamAV (auto-hébergé) | Analyse antivirus des fichiers téléversés | Contenu des fichiers téléversés (jamais conservé) | Hébergé avec la plateforme |

Les transferts hors de Côte d'Ivoire sont soumis à autorisation ou déclaration auprès de l'ARTCI : **à examiner par le juriste**.

## 5. Mesures de sécurité (résumé)

Mots de passe hachés (Argon2) ; jetons d'accès courts (15 minutes) et jetons de rafraîchissement hachés et révocables ; isolation stricte par entreprise (tenant) ; contrôle d'accès par permissions ; URL de téléversement et de lecture signées et limitées dans le temps ; analyse antivirus avant toute mise à disposition d'un fichier ; journal d'audit des actions sensibles ; limitation de débit sur l'authentification, l'export et la suppression.

## 6. Points ouverts pour le juriste

1. Qualification exacte (responsable de traitement / sous-traitant) et contrat entre l'exploitant et les entreprises.
2. Durée de conservation comptable applicable aux paiements et au grand livre.
3. Conservation du nom sur les PDF de certificats déjà délivrés (choix actuel : seul le nom enregistré en base est remplacé).
4. Durée de conservation du journal d'audit (adresses IP) et des journaux techniques.
5. Transferts hors Côte d'Ivoire (AWS, Google, fournisseurs de paiement, e-mail, traduction) : autorisations ARTCI.
6. Déclaration/autorisation préalable auprès de l'ARTCI et désignation éventuelle d'un correspondant à la protection des données.
7. Procédure d'opposition/limitation et délai de réponse aux demandes.
