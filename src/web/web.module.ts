import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebService } from './web.service';
import { WebController } from './web.controller';
import { EmployeeAuthGuard } from './employee-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'mundial2026_secret',
        signOptions: { expiresIn: '2h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebService, EmployeeAuthGuard],
  controllers: [WebController],
})
export class WebModule {}
