import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { ConfirmUploadUseCase } from "../application/confirm-upload.use-case";
import { DeleteMediaAssetUseCase } from "../application/delete-media-asset.use-case";
import { GetMediaAssetStatusUseCase } from "../application/get-media-asset-status.use-case";
import { GetPlaybackUrlUseCase } from "../application/get-playback-url.use-case";
import { RequestUploadUseCase } from "../application/request-upload.use-case";

import { RequestUploadDto } from "./dto/request-upload.dto";

/** ENT-24: téléversement de ressources (PDF, audio, vidéo, image), diffusion vidéo en streaming (HLS). */
@ApiTags("Entreprise / Médias")
@Controller("business/media")
export class BusinessMediaController {
  constructor(
    private readonly requestUploadUseCase: RequestUploadUseCase,
    private readonly confirmUploadUseCase: ConfirmUploadUseCase,
    private readonly getPlaybackUrlUseCase: GetPlaybackUrlUseCase,
    private readonly getMediaAssetStatusUseCase: GetMediaAssetStatusUseCase,
    private readonly deleteMediaAssetUseCase: DeleteMediaAssetUseCase,
  ) {}

  @Post("upload-request")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Demander une URL de téléversement présignée (section 12)" })
  async requestUpload(@CurrentTenant() tenantId: string, @Body() dto: RequestUploadDto) {
    const result = await this.requestUploadUseCase.execute({ tenantId, ...dto });
    return {
      mediaAssetId: result.mediaAssetId,
      uploadUrl: result.upload.uploadUrl,
      requiredHeaders: result.upload.requiredHeaders,
      expiresAt: result.upload.expiresAt,
    };
  }

  @Post(":mediaAssetId/confirm")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Confirmer la fin du téléversement (lance l'analyse antivirus, puis le transcodage si vidéo)" })
  async confirmUpload(@CurrentTenant() tenantId: string, @Param("mediaAssetId") mediaAssetId: string) {
    await this.confirmUploadUseCase.execute(mediaAssetId, tenantId);
    return { mediaAssetId };
  }

  @Get(":mediaAssetId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "État d'un média : analyse en cours (SCAN_PENDING), refusé (REJECTED), prêt…" })
  async getStatus(@CurrentTenant() tenantId: string, @Param("mediaAssetId") mediaAssetId: string) {
    return this.getMediaAssetStatusUseCase.execute(mediaAssetId, tenantId);
  }

  @Delete(":mediaAssetId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Annuler un téléversement en cours ou échoué (libère le stockage)" })
  async abandonUpload(@CurrentTenant() tenantId: string, @Param("mediaAssetId") mediaAssetId: string) {
    await this.deleteMediaAssetUseCase.abandon(mediaAssetId, tenantId);
    return { mediaAssetId, deleted: true };
  }

  @Get(":mediaAssetId/playback-url")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "URL de lecture signée à durée limitée (section 11)" })
  async getPlaybackUrl(@CurrentTenant() tenantId: string, @Param("mediaAssetId") mediaAssetId: string) {
    return this.getPlaybackUrlUseCase.execute(mediaAssetId, tenantId);
  }
}
