export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSenderPort {
  send(request: SendEmailRequest): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
