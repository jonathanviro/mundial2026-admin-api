// phases.controller.ts
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query, Request } from '@nestjs/common';
import { PhasesService, CreatePhaseDto, GenerateNextPhaseDto, AddMatchesDto, UpdatePhaseDto } from './phases.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../shared/guards/roles.guard';

@Controller('phases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhasesController {
  constructor(private service: PhasesService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  findAll(@Request() req, @Query('campaign_id') campaign_id?: string) {
    const cid = req.user.role === UserRole.CAMPAIGN_ADMIN
      ? req.user.campaign_id
      : campaign_id ? +campaign_id : undefined;
    return this.service.findAll(cid);
  }

  @Get('active')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  findActive(@Query('campaign_id') campaign_id: string) {
    return this.service.findActive(+campaign_id);
  }

  @Get('rules')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  rules() { return this.service.getPhaseRules(); }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: CreatePhaseDto) { return this.service.create(dto); }

  @Post(':id/publish')
  @Roles(UserRole.SUPERADMIN)
  publish(@Param('id') id: string) { return this.service.publish(+id); }

  @Post(':id/unpublish')
  @Roles(UserRole.SUPERADMIN)
  unpublish(@Param('id') id: string) { return this.service.unpublish(+id); }

  @Get(':id/standings')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  standings(@Param('id') id: string) {
    return this.service.getStandings(+id);
  }

  @Post('generate-next')
  @Roles(UserRole.SUPERADMIN)
  generateNext(@Body() dto: GenerateNextPhaseDto) {
    return this.service.generateNextPhase(dto);
  }

  @Post(':id/add-matches')
  @Roles(UserRole.SUPERADMIN)
  addMatches(@Param('id') id: string, @Body() dto: AddMatchesDto) {
    return this.service.addMatches(+id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePhaseDto) {
    return this.service.update(+id, dto);
  }
}
