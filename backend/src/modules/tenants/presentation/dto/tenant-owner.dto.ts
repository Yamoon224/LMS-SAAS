import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";

/** ADM-05: informations du premier utilisateur (Propriétaire) de l'entreprise. */
export class TenantOwnerDto {
  @ApiProperty({ example: "owner@acme.com" })
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

  @ApiPropertyOptional({
    example: "N0uveau-mot-de-passe!",
    description: "Mot de passe initial (8-128 car.). Absent : le Propriétaire reçoit un lien d'activation.",
    writeOnly: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
