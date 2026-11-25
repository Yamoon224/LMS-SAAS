import { Controller, Get, Header, Param, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import type { Response } from "express";

import { AuthorizeLearnerLiveSessionUseCase } from "../application/authorize-learner-live-session.use-case";
import { GetLiveSessionCalendarUseCase } from "../application/get-live-session-calendar.use-case";
import { ListLiveSessionsUseCase } from "../application/list-live-sessions.use-case";
import { RecordAttendanceUseCase } from "../application/record-attendance.use-case";
import { RegisterForLiveSessionUseCase } from "../application/register-for-live-session.use-case";

/** PUB: calendrier des sessions live d'une formation, inscription, suivi de présence. */
@ApiTags("Plateforme publique / Sessions live")
@Controller("public/live-sessions")
export class PublicLiveSessionsController {
  constructor(
    private readonly authorizeLearnerLiveSessionUseCase: AuthorizeLearnerLiveSessionUseCase,
    private readonly listLiveSessionsUseCase: ListLiveSessionsUseCase,
    private readonly registerForLiveSessionUseCase: RegisterForLiveSessionUseCase,
    private readonly recordAttendanceUseCase: RecordAttendanceUseCase,
    private readonly getLiveSessionCalendarUseCase: GetLiveSessionCalendarUseCase,
  ) {}

  @Get("courses/:courseId")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Calendrier des sessions live d'une formation" })
  async listForCourse(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
  ) {
    await this.authorizeLearnerLiveSessionUseCase.assertCourseAccess(courseId, user.userId, tenantId);
    const sessions = await this.listLiveSessionsUseCase.listForCourse(courseId);
    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      startAt: session.startAt,
      durationMinutes: session.durationMinutes,
      status: session.status,
      meetLink: session.meetLink,
      replayUrl: session.replayUrl,
    }));
  }

  @Get([":liveSessionId/calendar.ics", ":liveSessionId/ics"])
  @RequirePermissions("learner.take-lesson")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @ApiOperation({ summary: "Fichier .ics « Ajouter à mon agenda » d'une session live (PUB-13)" })
  async calendar(
    @Param("liveSessionId") liveSessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const file = await this.getLiveSessionCalendarUseCase.execute(liveSessionId, user.userId, tenantId);
    response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return file.content;
  }

  @Post(":liveSessionId/register")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "S'inscrire à une session live, dans la limite de la capacité (ENT-52)" })
  async register(
    @Param("liveSessionId") liveSessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ) {
    await this.authorizeLearnerLiveSessionUseCase.assertSessionAccess(liveSessionId, user.userId, tenantId);
    await this.registerForLiveSessionUseCase.execute(liveSessionId, user.userId);
    return { liveSessionId, registered: true };
  }

  @Post(":liveSessionId/join")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Signale la connexion effective à la session (suivi de présence, RG-08b)" })
  async join(
    @Param("liveSessionId") liveSessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ) {
    await this.authorizeLearnerLiveSessionUseCase.assertSessionAccess(liveSessionId, user.userId, tenantId);
    await this.recordAttendanceUseCase.recordJoin(liveSessionId, user.userId);
    return { liveSessionId };
  }

  @Post(":liveSessionId/leave")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Signale la déconnexion de la session (suivi de présence, RG-08b)" })
  async leave(
    @Param("liveSessionId") liveSessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ) {
    await this.authorizeLearnerLiveSessionUseCase.assertSessionAccess(liveSessionId, user.userId, tenantId);
    await this.recordAttendanceUseCase.recordLeave(liveSessionId, user.userId);
    return { liveSessionId };
  }
}
