import { OmitType } from "@nestjs/swagger";

import { UpdateBrandingDto } from "./tenant-settings.dto";

/** ADM-10 : identité visuelle modifiée par l'Admin ; le nom d'affichage reste celui des informations générales. */
export class AdminUpdateBrandingDto extends OmitType(UpdateBrandingDto, ["displayName"] as const) {}
