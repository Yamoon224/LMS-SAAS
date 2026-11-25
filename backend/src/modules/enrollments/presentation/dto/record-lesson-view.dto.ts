import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class RecordLessonViewDto {
  @ApiProperty({ required: false, example: 90, description: "Pourcentage visionné (vidéo/audio)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  watchedPercent?: number;
}
