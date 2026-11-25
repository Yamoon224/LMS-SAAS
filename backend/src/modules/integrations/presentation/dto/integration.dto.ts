import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsObject, IsOptional, IsString } from "class-validator";

export class SaveIntegrationDto {
  @ApiProperty({ description: "Valeurs par champ ; un secret vide ou absent est conservé." })
  @IsObject()
  values!: Record<string, string | boolean | number | null>;

  @ApiPropertyOptional({ description: "Secrets à supprimer." })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  clearSecrets?: string[];
}

export class TestSmtpDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail()
  to!: string;
}
