import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { Injectable } from "@nestjs/common";


import { CheckModuleCompletionUseCase } from "./check-module-completion.use-case";

/** RG-12/ENT-35: "l'examen final n'est accessible que si tous les modules sont validés." */
@Injectable()
export class CanAccessFinalExamUseCase {
  constructor(
    private readonly courseContentFacade: CourseContentFacade,
    private readonly checkModuleCompletionUseCase: CheckModuleCompletionUseCase,
  ) {}

  async execute(enrollmentId: string, courseId: string): Promise<boolean> {
    const modules = await this.courseContentFacade.listModules(courseId);
    if (modules.length === 0) return true;

    for (const courseModule of modules) {
      const validated = await this.checkModuleCompletionUseCase.execute(enrollmentId, courseModule.id);
      if (!validated) return false;
    }
    return true;
  }
}
