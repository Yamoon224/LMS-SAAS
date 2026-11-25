import { IntegrationsFacade } from "@modules/integrations/integrations.facade";
import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

import type { EmailSenderPort, SendEmailRequest } from "../domain/email-sender.port";

/**
 * Adaptateur e-mail via SMTP (section 12.7). nodemailer plutôt qu'un SDK propriétaire : compatible avec
 * n'importe quel fournisseur exposant un relais SMTP. La configuration (Admin > environnement) est relue à
 * chaque envoi (ADM-37) ; le transporteur n'est recréé que si elle a changé.
 */
@Injectable()
export class NodemailerEmailSenderAdapter implements EmailSenderPort {
  private cached: { signature: string; transporter: nodemailer.Transporter } | null = null;

  constructor(private readonly integrations: IntegrationsFacade) {}

  async send(request: SendEmailRequest): Promise<void> {
    const config = await this.integrations.resolve("EMAIL_SMTP");
    const from = config.fromAddress || "no-reply@votredomaine.local";
    const signature = JSON.stringify(config);

    if (this.cached?.signature !== signature) {
      this.cached?.transporter.close();
      this.cached = {
        signature,
        transporter: nodemailer.createTransport({
          host: config.host || "localhost",
          port: Number(config.port) || 587,
          secure: config.secure === "true",
          auth: config.user ? { user: config.user, pass: config.password } : undefined,
        }),
      };
    }

    await this.cached.transporter.sendMail({ from, to: request.to, subject: request.subject, text: request.body });
  }
}
