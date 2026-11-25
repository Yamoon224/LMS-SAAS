import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { nanoid } from "nanoid";

import { StorageObjectNotFoundError } from "../domain/object-storage.port";
import type {
  ObjectStoragePort,
  PresignedUploadRequest,
  PresignedUploadUrl,
  SignedPlaybackUrl,
} from "../domain/object-storage.port";

/**
 * Adaptateur stockage objet compatible S3 (section 12). Le téléversement est
 * toujours une URL S3 présignée directe, qu'on cible AWS S3 ou MinIO en
 * développement local (S3_ENDPOINT/S3_FORCE_PATH_STYLE, voir .env.example).
 *
 * La lecture bascule selon la configuration (section 15.4, section 11 —
 * "protection des médias") :
 *  - si CLOUDFRONT_DOMAIN et CLOUDFRONT_KEY_PAIR_ID sont renseignés
 *    (production), l'URL signée pointe vers CloudFront : jamais d'accès S3
 *    direct exposé au client ;
 *  - sinon (développement local avec MinIO, pas de CDN), repli sur une URL
 *    S3 présignée directe en lecture.
 */
@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly uploadTtlSeconds = 15 * 60; // 15 minutes pour réaliser le PUT
  private readonly cloudFrontDomain: string;
  private readonly cloudFrontKeyPairId: string;
  private readonly cloudFrontPrivateKey: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "saas-lms-dev";
    this.cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN ?? "";
    this.cloudFrontKeyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID ?? "";
    this.cloudFrontPrivateKey = process.env.CLOUDFRONT_PRIVATE_KEY ?? "";

    this.client = new S3Client({
      region: process.env.S3_REGION ?? "eu-west-3",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }

  async createPresignedUpload(request: PresignedUploadRequest): Promise<PresignedUploadUrl> {
    const storageKey = this.buildStorageKey(request.tenantId, request.filename);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: request.mimeType,
    });

    const uploadUrl = await getS3SignedUrl(this.client, command, { expiresIn: this.uploadTtlSeconds });
    const expiresAt = new Date(Date.now() + this.uploadTtlSeconds * 1000);

    return {
      uploadUrl,
      storageKey,
      requiredHeaders: { "Content-Type": request.mimeType },
      expiresAt,
    };
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }

  async openObject(storageKey: string): Promise<AsyncIterable<Uint8Array>> {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      if (!response.Body) throw new StorageObjectNotFoundError(storageKey);
      return response.Body as unknown as AsyncIterable<Uint8Array>;
    } catch (error) {
      if (error instanceof NoSuchKey || (error as { name?: string }).name === "NoSuchKey") {
        throw new StorageObjectNotFoundError(storageKey);
      }
      throw error;
    }
  }

  async createSignedPlaybackUrl(storageKeyOrPrefix: string, ttlSeconds: number): Promise<SignedPlaybackUrl> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    if (this.isCloudFrontConfigured()) {
      const url = getCloudFrontSignedUrl({
        url: `https://${this.cloudFrontDomain}/${storageKeyOrPrefix}`,
        keyPairId: this.cloudFrontKeyPairId,
        privateKey: this.cloudFrontPrivateKey,
        dateLessThan: expiresAt.toISOString(),
      });
      return { url, expiresAt };
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKeyOrPrefix });
    const url = await getS3SignedUrl(this.client, command, { expiresIn: ttlSeconds });
    return { url, expiresAt };
  }

  private isCloudFrontConfigured(): boolean {
    return Boolean(this.cloudFrontDomain && this.cloudFrontKeyPairId && this.cloudFrontPrivateKey);
  }

  private buildStorageKey(tenantId: string, filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    return `tenants/${tenantId}/${nanoid(16)}-${safeName}`;
  }
}
