import { PlansModule } from "@modules/plans/plans.module";
import { Module } from "@nestjs/common";

import { CompleteTranscodingUseCase } from "./application/complete-transcoding.use-case";
import { ConfirmUploadUseCase } from "./application/confirm-upload.use-case";
import { DeleteMediaAssetUseCase } from "./application/delete-media-asset.use-case";
import { GetMediaAssetStatusUseCase } from "./application/get-media-asset-status.use-case";
import { GetPlaybackUrlUseCase } from "./application/get-playback-url.use-case";
import { RequestUploadUseCase } from "./application/request-upload.use-case";
import { ScanUploadedAssetUseCase } from "./application/scan-uploaded-asset.use-case";
import { MALWARE_SCANNER } from "./domain/malware-scanner.port";
import { MEDIA_ASSET_REPOSITORY } from "./domain/media-asset.repository.port";
import { OBJECT_STORAGE } from "./domain/object-storage.port";
import { VIDEO_TRANSCODER } from "./domain/video-transcoder.port";
import { ClamavMalwareScannerAdapter } from "./infrastructure/clamav-malware-scanner.adapter";
import { MediaAssetPrismaRepository } from "./infrastructure/media-asset.prisma-repository";
import { MediaConvertVideoTranscoderAdapter } from "./infrastructure/mediaconvert-video-transcoder.adapter";
import { S3ObjectStorageAdapter } from "./infrastructure/s3-object-storage.adapter";
import { MediaFacade } from "./media.facade";
import { MediaScheduler } from "./media.scheduler";
import { BusinessMediaController } from "./presentation/business-media.controller";

@Module({
  imports: [PlansModule],
  controllers: [BusinessMediaController],
  providers: [
    RequestUploadUseCase,
    ConfirmUploadUseCase,
    CompleteTranscodingUseCase,
    GetPlaybackUrlUseCase,
    GetMediaAssetStatusUseCase,
    DeleteMediaAssetUseCase,
    ScanUploadedAssetUseCase,
    MediaScheduler,
    MediaFacade,
    { provide: MEDIA_ASSET_REPOSITORY, useClass: MediaAssetPrismaRepository },
    { provide: OBJECT_STORAGE, useClass: S3ObjectStorageAdapter },
    { provide: MALWARE_SCANNER, useFactory: () => new ClamavMalwareScannerAdapter() },
    { provide: VIDEO_TRANSCODER, useClass: MediaConvertVideoTranscoderAdapter },
  ],
  exports: [MediaFacade],
})
export class MediaModule {}
