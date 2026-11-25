import { Injectable } from "@nestjs/common";
import type { Exam as PrismaExam, Option as PrismaOption, Question as PrismaQuestion } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { Exam } from "../domain/exam.entity";
import type { SetExamRulesData } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { Option } from "../domain/option.vo";
import type { QuestionType } from "../domain/question-type";
import { Question } from "../domain/question.entity";
import type { CreateQuestionData } from "../domain/quiz.repository.port";

type PrismaQuestionWithOptions = PrismaQuestion & { options: PrismaOption[] };
type PrismaExamWithQuestions = PrismaExam & { questions: PrismaQuestionWithOptions[] };

@Injectable()
export class ExamPrismaRepository implements ExamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByCourseId(courseId: string): Promise<Exam | null> {
    const record = await this.prisma.exam.findUnique({
      where: { courseId },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<Exam | null> {
    const record = await this.prisma.exam.findUnique({
      where: { id },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async upsertForCourse(courseId: string, rules: SetExamRulesData): Promise<Exam> {
    const record = await this.prisma.exam.upsert({
      where: { courseId },
      update: {
        passingScorePercent: rules.passingScorePercent,
        maxAttempts: rules.maxAttempts,
        delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
        timeLimitMinutes: rules.timeLimitMinutes,
        questionsPerModule: rules.questionsPerModule,
        allowReentry: rules.allowReentry,
        weight: rules.weight,
      },
      create: {
        courseId,
        passingScorePercent: rules.passingScorePercent,
        maxAttempts: rules.maxAttempts,
        delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
        timeLimitMinutes: rules.timeLimitMinutes,
        questionsPerModule: rules.questionsPerModule,
        allowReentry: rules.allowReentry,
        weight: rules.weight,
      },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    return this.toDomain(record);
  }

  async addQuestion(examId: string, data: CreateQuestionData): Promise<void> {
    const lastOrder = await this.prisma.question.findFirst({
      where: { examId },
      orderBy: { order: "desc" },
    });

    await this.prisma.question.create({
      data: {
        examId,
        type: data.type,
        statementHtml: data.statementHtml,
        explanation: data.explanation,
        points: data.points,
        order: (lastOrder?.order ?? -1) + 1,
        options: {
          create: data.options.map((option, index) => ({
            label: option.label,
            isCorrect: option.isCorrect,
            order: index,
          })),
        },
      },
    });
  }

  async removeQuestion(questionId: string): Promise<void> {
    await this.prisma.question.delete({ where: { id: questionId } });
  }

  private toDomain(record: PrismaExamWithQuestions): Exam {
    return Exam.fromPersistence({
      id: record.id,
      courseId: record.courseId,
      passingScorePercent: record.passingScorePercent,
      maxAttempts: record.maxAttempts,
      delayBetweenAttemptsMinutes: record.delayBetweenAttemptsMinutes,
      timeLimitMinutes: record.timeLimitMinutes,
      questionsPerModule: record.questionsPerModule,
      allowReentry: record.allowReentry,
      weight: record.weight,
      questions: record.questions.map((question) => this.questionToDomain(question)),
    });
  }

  private questionToDomain(record: PrismaQuestionWithOptions): Question {
    return Question.fromPersistence({
      id: record.id,
      type: record.type as QuestionType,
      statementHtml: record.statementHtml,
      explanation: record.explanation,
      points: record.points,
      order: record.order,
      moduleWeight: record.moduleWeight,
      options: record.options
        .sort((a, b) => a.order - b.order)
        .map((option) =>
          Option.fromPersistence({
            id: option.id,
            label: option.label,
            isCorrect: option.isCorrect,
            order: option.order,
          }),
        ),
    });
  }
}
