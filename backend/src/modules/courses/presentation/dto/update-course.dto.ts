import { PartialType, PickType } from "@nestjs/swagger";

import { CreateCourseDto } from "./create-course.dto";

/** ENT-15/ENT-21: mêmes champs que la création, sans le type ni la locale source (immuables après création). */
export class UpdateCourseDto extends PartialType(
  PickType(CreateCourseDto, [
    "title",
    "subtitle",
    "description",
    "progressionMode",
    "price",
    "compareAtPrice",
    "accessDurationDays",
    "category",
    "level",
    "estimatedDurationMinutes",
    "coverImageUrl",
    "instructorIds",
  ] as const),
) {}
