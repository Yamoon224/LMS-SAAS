import { Controller, Get, Header, Param, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";
import type { Response } from "express";

import { ExamAttemptsQueryUseCase } from "../application/exam-attempts-query.use-case";
import type { AttemptFilters } from "../domain/attempt-query";

import { AttemptsQueryDto } from "./dto/attempts-query.dto";

function toFilters(query: AttemptsQueryDto): AttemptFilters {
  return { learner: query.learner, status: query.status, from: query.from, to: query.to };
}

/** ENT-37 : tentatives d'un examen (liste filtrée/paginée, export CSV, détail en lecture seule). */
@ApiTags("Entreprise / Tentatives d'examen")
@Controller("business/assessments")
export class BusinessAssessmentAttemptsController {
  constructor(private readonly examAttemptsQueryUseCase: ExamAttemptsQueryUseCase) {}

  @Get(":examId/attempts")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Tentatives d'un examen : filtres apprenant/statut/date, pagination (ENT-37)" })
  async list(@CurrentTenant() tenantId: string, @Param("examId") examId: string, @Query() query: AttemptsQueryDto) {
    return this.examAttemptsQueryUseCase.search(examId, tenantId, toFilters(query), query.page, query.pageSize);
  }

  @Get(":examId/attempts/export.csv")
  @RequirePermissions("courses.manage")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @ApiOperation({ summary: "Export CSV des tentatives (mêmes filtres que la liste)" })
  async exportCsv(
    @CurrentTenant() tenantId: string,
    @Param("examId") examId: string,
    @Query() query: AttemptsQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.examAttemptsQueryUseCase.exportCsv(examId, tenantId, toFilters(query));
    response.setHeader("Content-Disposition", 'attachment; filename="tentatives-examen.csv"');
    return csv;
  }

  @Get(":examId/attempts/:attemptId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Détail d'une tentative : réponses données, note, durée (lecture seule)" })
  async detail(
    @CurrentTenant() tenantId: string,
    @Param("examId") examId: string,
    @Param("attemptId") attemptId: string,
  ) {
    return this.examAttemptsQueryUseCase.detail(examId, attemptId, tenantId);
  }
}
