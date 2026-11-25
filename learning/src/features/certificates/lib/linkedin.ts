/** PUB-12 : lien « Ajouter à mon profil LinkedIn » (formulaire de certification pré-rempli). Fonction pure. */

export interface LinkedInCertificateInput {
  /** Nom de la certification (titre de la formation). */
  name: string;
  /** Nom de l'organisme émetteur (l'entreprise). */
  organizationName: string;
  /** Date de délivrance (ISO) ; une date absente ou invalide omet l'année et le mois. */
  issuedAt?: string | null;
  /** Page publique de vérification du certificat. */
  certUrl: string;
  /** Numéro du certificat. */
  certId: string;
}

const BASE = "https://www.linkedin.com/profile/add";
const MAX_FIELD = 200;

export function linkedInAddToProfileUrl(input: LinkedInCertificateInput): string {
  const pairs: [string, string][] = [
    ["startTask", "CERTIFICATION_NAME"],
    ["name", input.name.slice(0, MAX_FIELD)],
    ["organizationName", input.organizationName.slice(0, MAX_FIELD)],
  ];
  const issued = input.issuedAt ? new Date(input.issuedAt) : null;
  if (issued && !Number.isNaN(issued.getTime())) {
    pairs.push(["issueYear", String(issued.getUTCFullYear())], ["issueMonth", String(issued.getUTCMonth() + 1)]);
  }
  pairs.push(["certUrl", input.certUrl], ["certId", input.certId.slice(0, MAX_FIELD)]);
  // encodeURIComponent (et non « + » pour l'espace) : tous les caractères réservés sont encodés.
  return `${BASE}?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`;
}

/** Page publique de vérification d'un certificat sur l'origine donnée. */
export function verificationUrl(origin: string, number: string): string {
  return `${origin.replace(/\/+$/, "")}/verify/${encodeURIComponent(number)}`;
}
