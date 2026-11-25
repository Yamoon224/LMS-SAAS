import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, Length } from "class-validator";

export class EnrollDto {
  @ApiProperty()
  @IsString()
  courseId!: string;

  @ApiProperty({ example: "fr", default: "fr" })
  @IsString()
  @Length(2, 5)
  locale!: string;

  @ApiProperty({ default: false, description: "PUB-08: paiement hors plateforme" })
  @IsBoolean()
  isOfflinePayment!: boolean;
}
