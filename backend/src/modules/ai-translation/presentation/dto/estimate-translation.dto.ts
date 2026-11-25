import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class EstimateTranslationDto {
  @ApiProperty({ example: "en" })
  @IsString()
  @Length(2, 5)
  targetLocale!: string;
}
