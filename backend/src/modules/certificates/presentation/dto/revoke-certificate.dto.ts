import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RevokeCertificateDto {
  @ApiProperty({ description: "Motif obligatoire de la révocation (ENT-44)" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
