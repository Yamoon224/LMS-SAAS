import { Injectable } from "@nestjs/common";
import type {
  Option as PrismaOption,
  Question as PrismaQuestion,
  Quiz as PrismaQuiz,
} from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { Option } from "../domain/option.vo";
import type { QuestionType, ResultsDisplay } from "../domain/question-type";
import { Question } from "../domain/question.entity";
import { Quiz } from "../domain/quiz.entity";
import type {
  CreateQuestionData,
  QuizRepositoryPort,
  SetQuizRulesData,
} from "../domain/quiz.repository.port";

type PrismaQuestionWithOptions = PrismaQuestion & { options: PrismaOption[] };
type PrismaQuizWithQuestions = PrismaQuiz & { questions: PrismaQuestionWithOptions[] };

@Injectable()
export class QuizPrismaRepository implements QuizRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByModuleId(moduleId: string): Promise<Quiz | null> {
    const record = await this.prisma.quiz.findUnique({
      where: { moduleId },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<Quiz | null> {
    const record = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async upsertForModule(moduleId: string, rules: SetQuizRulesData): Promise<Quiz> {
    const record = await this.prisma.quiz.upsert({
      where: { moduleId },
      update: {
        passingScorePercent: rules.passingScorePercent,
        maxAttempts: rules.maxAttempts,
        delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
        timeLimitMinutes: rules.timeLimitMinutes,
        questionsToDraw: rules.questionsToDraw,
        shuffleQuestions: rules.shuffleQuestions,
        shuffleAnswers: rules.shuffleAnswers,
        resultsDisplay: rules.resultsDisplay,
        requireLiveAttendance: rules.requireLiveAttendance,
        weight: rules.weight,
      },
      create: {
        moduleId,
        passingScorePercent: rules.passingScorePercent,
        maxAttempts: rules.maxAttempts,
        delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
        timeLimitMinutes: rules.timeLimitMinutes,
        questionsToDraw: rules.questionsToDraw,
        shuffleQuestions: rules.shuffleQuestions,
        shuffleAnswers: rules.shuffleAnswers,
        resultsDisplay: rules.resultsDisplay,
        requireLiveAttendance: rules.requireLiveAttendance,
        weight: rules.weight,
      },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
    return this.toDomain(record);
  }

  async addQuestion(quizId: string, data: CreateQuestionData): Promise<void> {
    const lastOrder = await this.prisma.question.findFirst({
      where: { quizId },
      orderBy: { order: "desc" },
    });

    await this.prisma.question.create({
      data: {
        quizId,
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

  private toDomain(record: PrismaQuizWithQuestions): Quiz {
    return Quiz.fromPersistence({
      id: record.id,
      moduleId: record.moduleId,
      passingScorePercent: record.passingScorePercent,
      maxAttempts: record.maxAttempts,
      delayBetweenAttemptsMinutes: record.delayBetweenAttemptsMinutes,
      timeLimitMinutes: record.timeLimitMinutes,
      questionsToDraw: record.questionsToDraw,
      shuffleQuestions: record.shuffleQuestions,
      shuffleAnswers: record.shuffleAnswers,
      resultsDisplay: record.resultsDisplay as ResultsDisplay,
      requireLiveAttendance: record.requireLiveAttendance,
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
