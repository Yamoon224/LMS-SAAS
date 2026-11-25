export interface SmtpTestConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
}

export interface SmtpTesterPort {
  /** Vérifie la connexion au relais puis envoie un message d'essai. Lève en cas d'échec. */
  sendTest(config: SmtpTestConfig, to: string): Promise<void>;
}

export const SMTP_TESTER = Symbol("SMTP_TESTER");
