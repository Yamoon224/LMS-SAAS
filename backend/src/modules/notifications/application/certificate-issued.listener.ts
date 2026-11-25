import { CertificateIssuedEvent } from "@modules/certificates/certificates.events";
import { CertificatesFacade } from "@modules/certificates/certificates.facade";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ENT-41: informe l'apprenant que son certificat est disponible au téléchargement. */
@Injectable()
export class CertificateIssuedListener {
  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly certificatesFacade: CertificatesFacade,
  ) {}

  @OnEvent("certificate.issued")
  async handle(event: CertificateIssuedEvent): Promise<void> {
    const downloadUrl = await this.certificatesFacade.getDownloadUrl(event.certificateId);

    await this.notifyUserUseCase.execute({
      userId: event.learnerUserId,
      templateKey: "certificate.issued",
      payload: { courseTitle: event.courseTitle, downloadUrl },
    });
  }
}
