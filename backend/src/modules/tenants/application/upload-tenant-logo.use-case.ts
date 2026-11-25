import { Inject, Injectable } from "@nestjs/common";

import { detectImage, InvalidLogoFileError, LOGO_MAX_BYTES } from "../domain/logo-image";
import { LOGO_STORAGE } from "../domain/logo-storage.port";
import type { LogoStoragePort } from "../domain/logo-storage.port";

/**
 * ADM-10 / ENT-08 : téléversement d'un logo. Le fichier est contrôlé (taille, vrai type d'image) puis stocké ; son adresse est
 * ensuite enregistrée avec le reste de l'identité visuelle (le téléversement seul ne modifie aucune entreprise).
 */
@Injectable()
export class UploadTenantLogoUseCase {
  constructor(@Inject(LOGO_STORAGE) private readonly storage: LogoStoragePort) {}

  async execute(content: Buffer | undefined): Promise<{ logoUrl: string }> {
    if (!content || content.length === 0) throw new InvalidLogoFileError("Aucun fichier reçu.");
    if (content.length > LOGO_MAX_BYTES) {
      throw new InvalidLogoFileError(`Le logo ne peut pas dépasser ${LOGO_MAX_BYTES / (1024 * 1024)} Mo.`);
    }
    const image = detectImage(content);
    if (!image) throw new InvalidLogoFileError("Format non pris en charge : utilisez une image PNG, JPG ou WebP.");
    return { logoUrl: await this.storage.store(content, image.extension) };
  }
}
