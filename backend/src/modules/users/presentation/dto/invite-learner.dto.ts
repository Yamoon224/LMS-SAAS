import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

/** Invitation / auto-inscription d'un apprenant : jamais de `roleIds` (le rôle « Apprenant » est imposé côté serveur). */
export class InviteLearnerDto {
  @ApiProperty({ example: "apprenant@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Aya" })
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty({ example: "Koné" })
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @ApiProperty({ required: false, example: "+2250700000000" })
  @IsOptional()
  @IsString()
  @Length(5, 20)
  phone?: string;

  @ApiProperty({ required: false, example: "fr", default: "fr" })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  locale?: string;
}
