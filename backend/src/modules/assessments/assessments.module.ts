import { CourseContentModule } from "@modules/course-content/course-content.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { UsersModule } from "@modules/users/users.module";
import { Module } from "@nestjs/common";

import { AuthorizeLearnerAttemptUseCase } from "./application/authorize-learner-attempt.use-case";
import { CheckModuleQuizPassedUseCase } from "./application/check-module-quiz-passed.use-case";
import { ConfigureExamUseCase } from "./application/configure-exam.use-case";
import { ConfigureQuizUseCase } from "./application/configure-quiz.use-case";
import { CountSubmittedAttemptsUseCase } from "./application/count-submitted-attempts.use-case";
import { DoesModuleRequireLiveAttendanceUseCase } from "./application/does-module-require-live-attendance.use-case";
import { ExamAttemptsQueryUseCase } from "./application/exam-attempts-query.use-case";
import { ExpireOverdueAttemptsUseCase } from "./application/expire-overdue-attempts.use-case";
import { GetBestExamScoreUseCase } from "./application/get-best-exam-score.use-case";
import { GetBestQuizScoreUseCase } from "./application/get-best-quiz-score.use-case";
import { GetExamResultForCourseUseCase } from "./application/get-exam-result-for-course.use-case";
import { GetLearnerAssessmentInfoUseCase } from "./application/get-learner-assessment-info.use-case";
import { GetLearnerAttemptUseCase } from "./application/get-learner-attempt.use-case";
import { GetWeightedFinalScoreUseCase } from "./application/get-weighted-final-score.use-case";
import { GrantExtraAttemptsUseCase } from "./application/grant-extra-attempts.use-case";
import { ListExamAttemptsUseCase } from "./application/list-exam-attempts.use-case";
import { ManageExamQuestionsUseCase } from "./application/manage-exam-questions.use-case";
import { ManageQuizQuestionsUseCase } from "./application/manage-quiz-questions.use-case";
import { StartExamAttemptUseCase } from "./application/start-exam-attempt.use-case";
import { StartQuizAttemptUseCase } from "./application/start-quiz-attempt.use-case";
import { SubmitAnswerUseCase } from "./application/submit-answer.use-case";
import { SubmitAttemptUseCase } from "./application/submit-attempt.use-case";
import { AssessmentsFacade } from "./assessments.facade";
import { AssessmentsScheduler } from "./assessments.scheduler";
import { ATTEMPT_GRANT_REPOSITORY } from "./domain/attempt-grant.repository.port";
import { ATTEMPT_REPOSITORY } from "./domain/attempt.repository.port";
import { EXAM_REPOSITORY } from "./domain/exam.repository.port";
import { QUIZ_REPOSITORY } from "./domain/quiz.repository.port";
import { AttemptGrantPrismaRepository } from "./infrastructure/attempt-grant.prisma-repository";
import { AttemptPrismaRepository } from "./infrastructure/attempt.prisma-repository";
import { ExamPrismaRepository } from "./infrastructure/exam.prisma-repository";
import { QuizPrismaRepository } from "./infrastructure/quiz.prisma-repository";
import { BusinessAssessmentAttemptsController } from "./presentation/business-assessment-attempts.controller";
import { BusinessExamController } from "./presentation/business-exam.controller";
import { BusinessQuizController } from "./presentation/business-quiz.controller";
import { PublicAttemptsController } from "./presentation/public-attempts.controller";

@Module({
  imports: [CoursesModule, CourseContentModule, UsersModule],
  controllers: [BusinessQuizController, BusinessExamController, BusinessAssessmentAttemptsController, PublicAttemptsController],
  providers: [
    CountSubmittedAttemptsUseCase,
    AuthorizeLearnerAttemptUseCase,
    ConfigureQuizUseCase,
    ConfigureExamUseCase,
    ManageQuizQuestionsUseCase,
    ManageExamQuestionsUseCase,
    StartQuizAttemptUseCase,
    StartExamAttemptUseCase,
    SubmitAnswerUseCase,
    SubmitAttemptUseCase,
    GrantExtraAttemptsUseCase,
    ListExamAttemptsUseCase,
    ExamAttemptsQueryUseCase,
    GetWeightedFinalScoreUseCase,
    GetBestQuizScoreUseCase,
    GetLearnerAssessmentInfoUseCase,
    GetLearnerAttemptUseCase,
    GetBestExamScoreUseCase,
    GetExamResultForCourseUseCase,
    CheckModuleQuizPassedUseCase,
    DoesModuleRequireLiveAttendanceUseCase,
    ExpireOverdueAttemptsUseCase,
    AssessmentsFacade,
    AssessmentsScheduler,
    { provide: QUIZ_REPOSITORY, useClass: QuizPrismaRepository },
    { provide: EXAM_REPOSITORY, useClass: ExamPrismaRepository },
    { provide: ATTEMPT_REPOSITORY, useClass: AttemptPrismaRepository },
    { provide: ATTEMPT_GRANT_REPOSITORY, useClass: AttemptGrantPrismaRepository },
  ],
  exports: [AssessmentsFacade],
})
export class AssessmentsModule {}
