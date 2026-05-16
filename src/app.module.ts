import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './shared/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { UsersModule } from './users/users.module';
import { TotemsModule } from './totems/totems.module';
import { EmployeesModule } from './employees/employees.module';
import { WebModule } from './web/web.module';
import { PhasesModule } from './phases/phases.module';
import { MatchesModule } from './matches/matches.module';
import { ParticipantsModule } from './participants/participants.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CampaignsModule,
    UsersModule,
    TotemsModule,
    EmployeesModule,
    WebModule,
    PhasesModule,
    MatchesModule,
    ParticipantsModule,
    RegistrationsModule,
    SyncModule,
  ],
})
export class AppModule {}
