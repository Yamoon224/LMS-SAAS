import { AttestationIssuedEvent } from "@modules/certificates/certificates.events";
import { CertificatesFacade } from "@modules/certificates/certificates.facade";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-44: informe l'apprenant que son attestation de suivi est disponible au téléchargement. */
@Injectable()
export class AttestationIssuedListener {
  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly certificatesFacade: CertificatesFacade,
  ) {}

  @OnEvent("attestation.issued")
  async handle(event: AttestationIssuedEvent): Promise<void> {
    const downloadUrl = await this.certificatesFacade.getAttestationDownloadUrl(event.attestationId);

    await this.notifyUserUseCase.execute({
      userId: event.learnerUserId,
      templateKey: "attestation.issued",
      payload: { courseTitle: event.courseTitle, downloadUrl },
    });
  }
}
