import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, Length, Matches, ValidateNested } from "class-validator";

import { TenantOwnerDto } from "./tenant-owner.dto";

export class CreateTenantDto {
  @ApiProperty({ example: "Acme Formation" })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiProperty({ example: "acme", description: "Identifiant unique du sous-domaine" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "Le slug doit contenir uniquement des minuscules, chiffres et tirets." })
  @Length(2, 63)
  slug!: string;

  @ApiProperty({ example: "CI", default: "CI" })
  @IsString()
  @Length(2, 2)
  country!: string;

  @ApiProperty({ example: "XOF", default: "XOF" })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ example: "fr", default: "fr" })
  @IsString()
  @Length(2, 5)
  defaultLocale!: string;

  @ApiProperty({ type: TenantOwnerDto, description: "Premier utilisateur (Propriétaire) de l'entreprise" })
  @ValidateNested()
  @Type(() => TenantOwnerDto)
  owner!: TenantOwnerDto;
}
