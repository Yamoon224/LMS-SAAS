import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsUUID } from "class-validator";

export class TransferOwnershipDto {
  @ApiProperty({ description: "Compte actif de l'entreprise qui devient Propriétaire" })
  @IsUUID()
  newOwnerUserId!: string;

  @ApiProperty({ description: "Confirmation explicite (action sensible)", example: true })
  @Equals(true, { message: "Confirmation requise." })
  confirm!: boolean;
}
