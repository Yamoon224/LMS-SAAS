import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsUUID } from "class-validator";

/** ENT-57 : pointage manuel d'un inscrit. */
export class MarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: "true = présent, false = absent" })
  @IsBoolean()
  present!: boolean;
}
