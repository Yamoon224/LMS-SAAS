
import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { Injectable } from "@nestjs/common";

import { isModuleAccessible } from "../domain/module-access";
import type { ModuleOrderInfo, ProgressionMode } from "../domain/module-access";

import { CheckModuleCompletionUseCase } from "./check-module-completion.use-case";

export interface ModuleAccessResult {
  moduleId: string;
  title: string;
  order: number;
  validated: boolean;
  accessible: boolean;
}

/**
 * RG-09/ENT-19: calcule, pour chaque module d'une formation, s'il est validé
 * et s'il est accessible selon le mode de progression (séquentiel ou libre).
 * PUB-05/UX-14: alimente l'affichage "modules verrouillés avec la raison".
 */
@Injectable()
export class GetAccessibleModulesUseCase {
  constructor(
    private readonly courseContentFacade: CourseContentFacade,
    private readonly checkModuleCompletionUseCase: CheckModuleCompletionUseCase,
  ) {}

  async execute(
    enrollmentId: string,
    courseId: string,
    progressionMode: ProgressionMode,
  ): Promise<ModuleAccessResult[]> {
    const modules = await this.courseContentFacade.listModules(courseId);

    const orderInfos: ModuleOrderInfo[] = [];
    const titles = new Map<string, string>();
    for (const courseModule of modules) {
      const validated = await this.checkModuleCompletionUseCase.execute(enrollmentId, courseModule.id);
      orderInfos.push({ moduleId: courseModule.id, order: courseModule.order, validated });
      titles.set(courseModule.id, courseModule.title);
    }

    return orderInfos.map((info) => ({
      moduleId: info.moduleId,
      title: titles.get(info.moduleId) ?? "",
      order: info.order,
      validated: info.validated,
      accessible: isModuleAccessible(info, orderInfos, progressionMode),
    }));
  }
}
