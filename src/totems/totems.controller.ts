// totems.controller.ts
import { Controller, Get, Post, Put, Param, Body, UseGuards, Query, Request } from '@nestjs/common';
import { TotemsService, CreateTotemDto, UpdateTotemDto } from './totems.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../shared/guards/roles.guard';

@Controller('totems')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TotemsController {
  constructor(private service: TotemsService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  findAll(@Request() req, @Query('campaign_id') campaign_id?: string) {
    // campaign_admin solo ve sus tótems
    if (req.user.role === UserRole.CAMPAIGN_ADMIN) {
      return this.service.findAll(req.user.campaign_id);
    }
    return this.service.findAll(campaign_id ? +campaign_id : undefined);
  }

  @Get('dashboard')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  dashboard(@Request() req, @Query('campaign_id') campaign_id?: string) {
    if (req.user.role === UserRole.CAMPAIGN_ADMIN) {
      return this.service.getDashboardStatus(req.user.campaign_id);
    }
    return this.service.getDashboardStatus(campaign_id ? +campaign_id : undefined);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: CreateTotemDto) { return this.service.create(dto); }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTotemDto) {
    return this.service.update(+id, dto);
  }
}
