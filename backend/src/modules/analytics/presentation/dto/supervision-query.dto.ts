import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class SupervisionQueryDto {
  @ApiProperty({ required: false, description: "Limiter à une entreprise" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;
}
