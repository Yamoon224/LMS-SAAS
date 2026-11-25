import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class ExtendAccessDto {
  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  additionalDays!: number;
}
