import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min } from "class-validator";

/** ENT-31: accorder des tentatives supplémentaires à un apprenant précis. */
export class GrantAttemptsDto {
  @ApiProperty()
  @IsString()
  enrollmentId!: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  extraAttempts!: number;
}
