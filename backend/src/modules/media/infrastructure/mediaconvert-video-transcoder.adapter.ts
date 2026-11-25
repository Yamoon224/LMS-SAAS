import {
  CreateJobCommand,
  GetJobCommand,
  MediaConvertClient,
  type JobStatus,
} from "@aws-sdk/client-mediaconvert";
import { Injectable } from "@nestjs/common";

import type {
  TranscodeJobHandle,
  TranscodeJobResult,
  TranscodeRequest,
  VideoTranscoderPort,
} from "../domain/video-transcoder.port";

/**
 * Adaptateur AWS Elemental MediaConvert (section 15.4): HLS multi-débits
 * (240p/360p/480p/720p), vignettes, chiffrement AES-128 optionnel. Le job
 * complet (groupe de sorties, presets de qualité) est défini côté
 * infrastructure AWS (template de job) — cet adaptateur se contente de le
 * déclencher avec la source et la destination, et d'interroger son statut.
 */
@Injectable()
export class MediaConvertVideoTranscoderAdapter implements VideoTranscoderPort {
  private readonly client: MediaConvertClient;
  private readonly bucket: string;
  private readonly queueArn: string | undefined;
  private readonly roleArn: string;
  private readonly jobTemplateName: string | undefined;

  constructor() {
    this.client = new MediaConvertClient({ region: process.env.AWS_REGION ?? "eu-west-3" });
    this.bucket = process.env.S3_BUCKET ?? "saas-lms-dev";
    this.queueArn = process.env.MEDIACONVERT_QUEUE_ARN;
    this.roleArn = process.env.MEDIACONVERT_ROLE_ARN ?? "";
    this.jobTemplateName = process.env.MEDIACONVERT_JOB_TEMPLATE;
  }

  async startTranscoding(request: TranscodeRequest): Promise<TranscodeJobHandle> {
    const response = await this.client.send(
      new CreateJobCommand({
        Role: this.roleArn,
        Queue: this.queueArn,
        JobTemplate: this.jobTemplateName,
        Settings: {
          Inputs: [{ FileInput: `s3://${this.bucket}/${request.sourceStorageKey}` }],
          OutputGroups: [
            {
              OutputGroupSettings: {
                Type: "HLS_GROUP_SETTINGS",
                HlsGroupSettings: {
                  Destination: `s3://${this.bucket}/${request.outputPrefix}/`,
                },
              },
            },
          ],
        },
      }),
    );

    const jobId = response.Job?.Id;
    if (!jobId) {
      throw new Error("MediaConvert n'a pas retourné d'identifiant de job.");
    }

    return { providerJobId: jobId };
  }

  async getJobStatus(providerJobId: string): Promise<TranscodeJobResult> {
    const response = await this.client.send(new GetJobCommand({ Id: providerJobId }));
    const status = response.Job?.Status;

    // La durée réelle de la vidéo source n'est pas exposée par GetJobCommand
    // (seul le temps de traitement du job l'est, via Job.Timing — une donnée
    // différente qu'il serait trompeur de renvoyer ici comme "durée du
    // média"). Elle doit être lue depuis OutputGroupDetails[].OutputDetails[]
    // une fois le job terminé, à affiner quand ce besoin se présentera
    // réellement (affichage de la durée côté apprenant, PUB-09).
    return {
      status: this.mapStatus(status),
      errorMessage: response.Job?.ErrorMessage,
    };
  }

  private mapStatus(status: JobStatus | undefined): TranscodeJobResult["status"] {
    if (status === "COMPLETE") return "COMPLETE";
    if (status === "ERROR" || status === "CANCELED") return "ERROR";
    return "IN_PROGRESS";
  }
}
