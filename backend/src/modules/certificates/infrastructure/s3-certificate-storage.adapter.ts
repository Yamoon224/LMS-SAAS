import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";

import type { CertificateStoragePort } from "../domain/certificate-storage.port";

/**
 * Adaptateur de stockage dédié à ce module (section 13.2: pas de dépendance
 * au client S3 interne du module media). Le PDF est généré côté serveur et
 * téléversé directement — contrairement au module media, il n'y a jamais
 * d'URL présignée d'upload à fournir à un client.
 */
@Injectable()
export class S3CertificateStorageAdapter implements CertificateStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
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

  async uploadPdf(tenantId: string, certificateNumber: string, pdf: Buffer): Promise<string> {
    const storageKey = `tenants/${tenantId}/certificates/${certificateNumber}.pdf`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: pdf,
        ContentType: "application/pdf",
      }),
    );
    return storageKey;
  }

  async createSignedDownloadUrl(storageKey: string, ttlSeconds: number): Promise<string> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    if (this.isCloudFrontConfigured()) {
      return getCloudFrontSignedUrl({
        url: `https://${this.cloudFrontDomain}/${storageKey}`,
        keyPairId: this.cloudFrontKeyPairId,
        privateKey: this.cloudFrontPrivateKey,
        dateLessThan: expiresAt.toISOString(),
      });
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getS3SignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }

  private isCloudFrontConfigured(): boolean {
    return Boolean(this.cloudFrontDomain && this.cloudFrontKeyPairId && this.cloudFrontPrivateKey);
  }
}
