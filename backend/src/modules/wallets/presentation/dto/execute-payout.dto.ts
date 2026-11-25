import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class ExecutePayoutDto {
  @ApiProperty({ description: "URL du justificatif joint (virement ou mobile money)" })
  @IsString()
  @Length(3, 2000)
  proofUrl!: string;
}
