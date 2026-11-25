import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

import type { SmtpTesterPort, SmtpTestConfig } from "../domain/smtp-tester.port";

const TIMEOUT_MS = 10_000;

@Injectable()
export class NodemailerSmtpTesterAdapter implements SmtpTesterPort {
  async sendTest(config: SmtpTestConfig, to: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
    try {
      await transporter.verify();
      await transporter.sendMail({
        from: config.fromAddress,
        to,
        subject: "Test de la configuration e-mail",
        text: "Ce message confirme que la configuration SMTP de la plateforme fonctionne.",
      });
    } finally {
      transporter.close();
    }
  }
}
