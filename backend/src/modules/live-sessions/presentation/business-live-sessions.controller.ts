import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { Body, Controller, Get, Header, Param, Post, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { NotFoundDomainError } from "@shared/errors";
import type { Response } from "express";

import { CancelLiveSessionUseCase } from "../application/cancel-live-session.use-case";
import { GetLiveSessionCalendarUseCase } from "../application/get-live-session-calendar.use-case";
import { ListLiveSessionsUseCase } from "../application/list-live-sessions.use-case";
import { ManageSessionAttendanceUseCase } from "../application/manage-session-attendance.use-case";
import { ScheduleLiveSessionUseCase } from "../application/schedule-live-session.use-case";
import { SetReplayUrlUseCase } from "../application/set-replay-url.use-case";

import { MarkAttendanceDto } from "./dto/mark-attendance.dto";
import { ScheduleLiveSessionDto } from "./dto/schedule-live-session.dto";
import { SetReplayUrlDto } from "./dto/set-replay-url.dto";

/** ENT-52 à ENT-58: planification et gestion des sessions live Google Meet. */
@ApiTags("Entreprise / Sessions live")
@Controller("business/live-sessions")
export class BusinessLiveSessionsController {
  constructor(
    private readonly scheduleLiveSessionUseCase: ScheduleLiveSessionUseCase,
    private readonly cancelLiveSessionUseCase: CancelLiveSessionUseCase,
    private readonly setReplayUrlUseCase: SetReplayUrlUseCase,
    private readonly listLiveSessionsUseCase: ListLiveSessionsUseCase,
    private readonly manageSessionAttendanceUseCase: ManageSessionAttendanceUseCase,
    private readonly getLiveSessionCalendarUseCase: GetLiveSessionCalendarUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
  ) {}

  /** Formation du tenant + (optionnel) module qui doit appartenir à cette formation: 404 sinon. */
  private async assertScope(tenantId: string, courseId: string, moduleId?: string): Promise<void> {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    if (moduleId) {
      const moduleCourseId = await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
      if (moduleCourseId !== courseId) {
        throw new NotFoundDomainError(`Module introuvable: ${moduleId}`);
      }
    }
  }

  @Post("courses/:courseId")
  @RequirePermissions("live-sessions.manage")
  @ApiOperation({ summary: "Planifier une session live avec Google Meet (ENT-52/ENT-53)" })
  async schedule(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: ScheduleLiveSessionDto,
  ) {
    await this.assertScope(tenantId, courseId, dto.moduleId);
    const session = await this.scheduleLiveSessionUseCase.execute({
      courseId,
      moduleId: dto.moduleId,
      title: dto.title,
      startAt: new Date(dto.startAt),
      durationMinutes: dto.durationMinutes,
      timezone: dto.timezone,
      capacity: dto.capacity,
    });
    return { id: session.id, meetLink: session.meetLink, status: session.status };
  }

  @Get("courses/:courseId")
  @RequirePermissions("live-sessions.manage")
  @ApiOperation({ summary: "Calendrier des sessions live d'une formation" })
  async listForCourse(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Query("moduleId") moduleId?: string,
  ) {
    await this.assertScope(tenantId, courseId, moduleId);
    const sessions = moduleId
      ? await this.listLiveSessionsUseCase.listForModule(moduleId)
      : await this.listLiveSessionsUseCase.listForCourse(courseId);

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      moduleId: session.moduleId,
      startAt: session.startAt,
      durationMinutes: session.durationMinutes,
      capacity: session.capacity,
      status: session.status,
      meetLink: session.meetLink,
      replayUrl: session.replayUrl,
    }));
  }

  @Get(":liveSessionId/attendance")
  @RequirePermissions("live-sessions.manage")
  @ApiOperation({ summary: "Inscrits à la session et statut de présence (ENT-57)" })
  async listAttendance(@CurrentTenant() tenantId: string, @Param("liveSessionId") liveSessionId: string) {
    return this.manageSessionAttendanceUseCase.list(liveSessionId, tenantId);
  }

  @Post(":liveSessionId/attendance")
  @RequirePermissions("live-sessions.manage")
  @ApiOperation({ summary: "Pointage manuel présent/absent d'un inscrit (ENT-57, audité)" })
  async markAttendance(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("liveSessionId") liveSessionId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    const status = await this.manageSessionAttendanceUseCase.mark(
      liveSessionId,
      tenantId,
      dto.userId,
      dto.present,
      user.userId,
    );
    return { liveSessionId, userId: dto.userId, status };
  }

  @Get(":liveSessionId/ics")
  @RequirePermissions("live-sessions.manage")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @ApiOperation({ summary: "Fichier .ics de la session (ENT-56)" })
  async ics(
    @CurrentTenant() tenantId: string,
    @Param("liveSessionId") liveSessionId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const file = await this.getLiveSessionCalendarUseCase.executeForTenant(liveSessionId, tenantId);
    response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return file.content;
  }

  @Post(":liveSessionId/cancel")
  @RequirePermissions("live-sessions.manage")
  @ApiOperation({ summary: "Annuler une session planifiée (ENT-56)" })
  async cancel(@CurrentTenant() tenantId: string, @Param("liveSessionId") liveSessionId: string) {
    await this.cancelLiveSessionUseCase.execute(liveSessionId, tenantId);
    return { liveSessionId, status: "CANCELED" };
  }

  @Post(":liveSessionId/replay")
  @RequirePermissions("live-sessions.manage")
  @ApiOperation({ summary: "Déposer le lien de replay (ENT-57)" })
  async setReplay(
    @CurrentTenant() tenantId: string,
    @Param("liveSessionId") liveSessionId: string,
    @Body() dto: SetReplayUrlDto,
  ) {
    await this.setReplayUrlUseCase.execute(liveSessionId, tenantId, dto.replayUrl);
    return { liveSessionId };
  }
}
