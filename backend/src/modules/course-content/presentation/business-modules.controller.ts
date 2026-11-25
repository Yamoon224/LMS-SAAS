import { CoursesFacade } from "@modules/courses/courses.facade";
import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { AssertContentInTenantUseCase } from "../application/assert-content-in-tenant.use-case";
import { CreateModuleUseCase } from "../application/create-module.use-case";
import { DeleteModuleUseCase } from "../application/delete-module.use-case";
import { ListModulesUseCase } from "../application/list-modules.use-case";
import { ReorderModulesUseCase } from "../application/reorder-modules.use-case";
import { UpdateModuleUseCase } from "../application/update-module.use-case";

import { CreateModuleDto } from "./dto/create-module.dto";
import { ReorderDto } from "./dto/reorder.dto";
import { UpdateModuleDto } from "./dto/update-module.dto";

/** ENT-22: ajouter, ordonner, éditer, supprimer des modules. */
@ApiTags("Entreprise / Modules de formation")
@Controller("business/courses/:courseId/modules")
export class BusinessModulesController {
  constructor(
    private readonly createModuleUseCase: CreateModuleUseCase,
    private readonly updateModuleUseCase: UpdateModuleUseCase,
    private readonly deleteModuleUseCase: DeleteModuleUseCase,
    private readonly reorderModulesUseCase: ReorderModulesUseCase,
    private readonly listModulesUseCase: ListModulesUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly assertContentInTenantUseCase: AssertContentInTenantUseCase,
  ) {}

  @Post()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Ajouter un module (ENT-22)" })
  async create(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const courseModule = await this.createModuleUseCase.execute({ courseId, ...dto });
    return { id: courseModule.id, order: courseModule.order };
  }

  @Get()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Lister les modules d'une formation (programme)" })
  async list(@CurrentTenant() tenantId: string, @Param("courseId") courseId: string) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const modules = await this.listModulesUseCase.execute(courseId);
    return modules.map((courseModule) => ({
      id: courseModule.id,
      title: courseModule.title,
      order: courseModule.order,
    }));
  }

  @Put("reorder")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Réordonner les modules par glisser-déposer (ENT-22)" })
  async reorder(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: ReorderDto,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    await this.reorderModulesUseCase.execute(courseId, dto.orderedIds);
    return { courseId, order: dto.orderedIds };
  }

  @Put(":moduleId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Modifier un module (ENT-22)" })
  async update(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    await this.assertContentInTenantUseCase.assertModule(moduleId, tenantId, courseId);
    await this.updateModuleUseCase.execute(moduleId, dto);
    return { id: moduleId };
  }

  @Delete(":moduleId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Supprimer un module (ENT-22)" })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Param("moduleId") moduleId: string,
  ) {
    await this.assertContentInTenantUseCase.assertModule(moduleId, tenantId, courseId);
    await this.deleteModuleUseCase.execute(moduleId);
    return { id: moduleId, deleted: true };
  }
}
