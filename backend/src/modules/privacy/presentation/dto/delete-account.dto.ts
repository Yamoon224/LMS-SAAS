import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/** Seul le mot de passe est accepté : l'identité du compte vient toujours du jeton. */
export class DeleteAccountDto {
  @ApiProperty({ description: "Mot de passe actuel, pour confirmer la suppression." })
  @IsString()
  @Length(1, 200)
  password!: string;
}
