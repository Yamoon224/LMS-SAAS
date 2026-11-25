/** Stockage des logos d'entreprise : fichiers publics (affichés sur les sites de l'entreprise), adresse stable. */
export interface LogoStoragePort {
  /** Enregistre l'image et renvoie son adresse publique absolue. */
  store(content: Buffer, extension: string): Promise<string>;
  /** Vrai si `url` désigne un fichier de ce stockage (seule exception à la règle « logo en https »). */
  isOwnUrl(url: string): boolean;
}

export const LOGO_STORAGE = Symbol("LOGO_STORAGE");
