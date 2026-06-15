import { Controller, Get, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../shared/guards/roles.guard';
import type { RegistrationSource } from '@prisma/client';

@Controller('registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
export class RegistrationsController {
  constructor(private service: RegistrationsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('campaign_id') cid?: string,
    @Query('phase_id') pid?: string,
    @Query('totem_id') tid?: string,
    @Query('source') source?: RegistrationSource,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : (cid ? +cid : undefined);
    return this.service.findAll(campaign_id, pid ? +pid : undefined, tid ? +tid : undefined, source, page ? +page : 1, limit ? +limit : 50, search, sortBy, sortOrder as 'asc' | 'desc');
  }

  @Get(':id/predictions')
  getPredictions(@Param('id') id: string) {
    return this.service.getPredictions(+id);
  }

  @Get('winners')
  winners(@Request() req, @Query('campaign_id') cid?: string, @Query('phase_id') pid?: string) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : (cid ? +cid : undefined);
    return this.service.findWinners(campaign_id, pid ? +pid : undefined);
  }

  @Get('stats')
  stats(@Request() req, @Query('campaign_id') cid?: string) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : (cid ? +cid : undefined);
    return this.service.stats(campaign_id);
  }

  @Get('export')
  async exportExcel(
    @Request() req,
    @Res() res: Response,
    @Query('campaign_id') cid?: string,
    @Query('phase_id') pid?: string,
    @Query('totem_id') tid?: string,
  ) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : (cid ? +cid : undefined);
    const buffer = await this.service.exportExcel(campaign_id, pid ? +pid : undefined, tid ? +tid : undefined);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="polla_mundial_2026_${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
