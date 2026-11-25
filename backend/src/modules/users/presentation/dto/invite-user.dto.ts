import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsEmail, IsOptional, IsString, Length } from "class-validator";

export class InviteUserDto {
  @ApiProperty({ example: "manager@acme.com" })
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
  phone?: string;

  @ApiProperty({ example: "fr", default: "fr" })
  @IsString()
  @Length(2, 5)
  locale!: string;

  @ApiProperty({ type: [String], description: "Identifiants des rôles à attribuer" })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds!: string[];
}
