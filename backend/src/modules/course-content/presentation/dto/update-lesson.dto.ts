import { PartialType, PickType } from "@nestjs/swagger";

import { CreateLessonDto } from "./create-lesson.dto";

/** resourceType est immuable après création (changer de type change la nature de la leçon). */
export class UpdateLessonDto extends PartialType(
  PickType(CreateLessonDto, [
    "title",
    "contentHtml",
    "storageUrl",
    "isMandatory",
    "completionCriteria",
    "downloadAllowed",
  ] as const),
) {}
