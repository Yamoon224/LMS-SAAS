import { Injectable } from "@nestjs/common";
import * as QRCode from "qrcode";

import type { QrCodeGeneratorPort } from "../domain/two-factor.repository.port";

/** QR code en data-URL PNG (dépendance `qrcode`), pour l'enrôlement dans une application d'authentification. */
@Injectable()
export class QrCodeGenerator implements QrCodeGeneratorPort {
  toDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content, { errorCorrectionLevel: "M", margin: 1, width: 240 });
  }
}
