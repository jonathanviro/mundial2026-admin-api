// participants.controller.ts
import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../shared/guards/roles.guard';

@Controller('participants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
export class ParticipantsController {
  constructor(private service: ParticipantsService) {}

  @Get()
  findAll(@Request() req, @Query('campaign_id') cid?: string, @Query('search') search?: string) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : +cid;
    return this.service.findAll(campaign_id, search);
  }
}
