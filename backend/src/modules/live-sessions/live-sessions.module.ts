import { CourseContentModule } from "@modules/course-content/course-content.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { EnrollmentsModule } from "@modules/enrollments/enrollments.module";
import { IntegrationsModule } from "@modules/integrations/integrations.module";
import { UsersModule } from "@modules/users/users.module";
import { forwardRef, Module } from "@nestjs/common";

import { AuthorizeLearnerLiveSessionUseCase } from "./application/authorize-learner-live-session.use-case";
import { CancelLiveSessionUseCase } from "./application/cancel-live-session.use-case";
import { GetLiveSessionCalendarUseCase } from "./application/get-live-session-calendar.use-case";
import { InviteLateEnrolleeListener } from "./application/invite-late-enrollee.listener";
import { IsLiveAttendanceSatisfiedUseCase } from "./application/is-live-attendance-satisfied.use-case";
import { ListLiveSessionsUseCase } from "./application/list-live-sessions.use-case";
import { ManageSessionAttendanceUseCase } from "./application/manage-session-attendance.use-case";
import { RecordAttendanceUseCase } from "./application/record-attendance.use-case";
import { RegisterForLiveSessionUseCase } from "./application/register-for-live-session.use-case";
import { ScheduleLiveSessionUseCase } from "./application/schedule-live-session.use-case";
import { SetReplayUrlUseCase } from "./application/set-replay-url.use-case";
import { TransitionLiveSessionStatusesUseCase } from "./application/transition-live-session-statuses.use-case";
import { ATTENDANCE_REPOSITORY } from "./domain/attendance.repository.port";
import { LIVE_SESSION_REPOSITORY } from "./domain/live-session.repository.port";
import { VIDEO_CONFERENCE_PROVIDER } from "./domain/video-conference-provider.port";
import { AttendancePrismaRepository } from "./infrastructure/attendance.prisma-repository";
import { GoogleCalendarVideoConferenceAdapter } from "./infrastructure/google-calendar-video-conference.adapter";
import { LiveSessionPrismaRepository } from "./infrastructure/live-session.prisma-repository";
import { LiveSessionsFacade } from "./live-sessions.facade";
import { LiveSessionsScheduler } from "./live-sessions.scheduler";
import { BusinessLiveSessionsController } from "./presentation/business-live-sessions.controller";
import { PublicLiveSessionsController } from "./presentation/public-live-sessions.controller";

@Module({
  imports: [CoursesModule, CourseContentModule, UsersModule, IntegrationsModule, forwardRef(() => EnrollmentsModule)],
  controllers: [BusinessLiveSessionsController, PublicLiveSessionsController],
  providers: [
    AuthorizeLearnerLiveSessionUseCase,
    ScheduleLiveSessionUseCase,
    CancelLiveSessionUseCase,
    RegisterForLiveSessionUseCase,
    RecordAttendanceUseCase,
    ManageSessionAttendanceUseCase,
    SetReplayUrlUseCase,
    ListLiveSessionsUseCase,
    GetLiveSessionCalendarUseCase,
    IsLiveAttendanceSatisfiedUseCase,
    InviteLateEnrolleeListener,
    TransitionLiveSessionStatusesUseCase,
    LiveSessionsFacade,
    LiveSessionsScheduler,
    { provide: LIVE_SESSION_REPOSITORY, useClass: LiveSessionPrismaRepository },
    { provide: ATTENDANCE_REPOSITORY, useClass: AttendancePrismaRepository },
    { provide: VIDEO_CONFERENCE_PROVIDER, useClass: GoogleCalendarVideoConferenceAdapter },
  ],
  exports: [LiveSessionsFacade],
})
export class LiveSessionsModule {}
