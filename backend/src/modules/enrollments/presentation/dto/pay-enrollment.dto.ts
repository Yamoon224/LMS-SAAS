import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

import { ENROLLMENT_PAYMENT_METHODS } from "../../application/initiate-enrollment-payment.use-case";
import type { EnrollmentPaymentMethod } from "../../application/initiate-enrollment-payment.use-case";

/** Le montant, la devise et l'e-mail ne sont JAMAIS acceptés du client: seul le moyen de paiement est choisi. */
export class PayEnrollmentDto {
  @ApiProperty({ enum: ENROLLMENT_PAYMENT_METHODS, example: "CARD" })
  @IsIn([...ENROLLMENT_PAYMENT_METHODS])
  method!: EnrollmentPaymentMethod;
}
