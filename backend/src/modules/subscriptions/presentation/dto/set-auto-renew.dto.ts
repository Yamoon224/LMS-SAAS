import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class SetAutoRenewDto {
  @ApiProperty({ description: "true pour activer le renouvellement automatique" })
  @IsBoolean()
  autoRenew!: boolean;
}
