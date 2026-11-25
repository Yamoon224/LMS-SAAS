export interface SendSmsRequest {
  to: string;
  body: string;
}

export interface SmsSenderPort {
  send(request: SendSmsRequest): Promise<void>;
}

export const SMS_SENDER = Symbol("SMS_SENDER");
