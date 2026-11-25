import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, Length } from "class-validator";

export class ScheduleLiveSessionDto {
  @ApiPropertyOptional({ description: "Module associé — la présence y sera exigée si le quiz le configure (ENT-29)" })
  @IsOptional()
  @IsString()
  moduleId?: string;

  @ApiProperty()
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiProperty({ example: "2026-03-15T10:00:00.000Z" })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @ApiProperty({ example: "Africa/Abidjan" })
  @IsString()
  timezone!: string;

  @ApiPropertyOptional({ description: "Nombre maximal de participants — illimité si omis" })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;
}
