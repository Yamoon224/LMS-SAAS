import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class SetLanguageEnabledDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
