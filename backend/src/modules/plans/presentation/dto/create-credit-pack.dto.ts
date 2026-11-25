import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, Min } from "class-validator";

export class CreateCreditPackDto {
  @ApiProperty({ example: "Pack 50 000 crédits" })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1)
  creditsAmount!: number;

  @ApiProperty({ example: 15000, description: "Prix en plus petite unité de la devise (BE-07)" })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({ example: "XOF", default: "XOF" })
  @IsString()
  @Length(3, 3)
  currency!: string;
}
