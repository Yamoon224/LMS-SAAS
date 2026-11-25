import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsUUID, Length } from "class-validator";

/** ENT-62 : inscription manuelle, sans paiement, d'un apprenant (existant, ou invité s'il est inconnu). */
export class ManualEnrollmentDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;

  @ApiProperty({ example: "apprenant@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false, description: "Requis si l'apprenant est inconnu (invitation)." })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiProperty({ required: false, description: "Requis si l'apprenant est inconnu (invitation)." })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiProperty({ example: "Partenariat : accès offert à la cohorte 2026." })
  @IsString()
  @Length(1, 500)
  reason!: string;
}
