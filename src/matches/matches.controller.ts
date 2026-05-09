// matches.controller.ts
import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { MatchesService, CreateMatchDto, SetResultDto, UpdateMatchTeamsDto } from './matches.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../shared/guards/roles.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchesController {
  constructor(private service: MatchesService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  findByPhase(@Query('phase_id') phase_id: string) {
    return this.service.findByPhase(+phase_id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: CreateMatchDto) { return this.service.create(dto); }

  @Post('bulk')
  @Roles(UserRole.SUPERADMIN)
  bulk(@Body() body: { matches: CreateMatchDto[] }) {
    return this.service.bulkCreate(body.matches);
  }

  @Put(':id/teams')
  @Roles(UserRole.SUPERADMIN)
  updateTeams(@Param('id') id: string, @Body() dto: UpdateMatchTeamsDto) {
    return this.service.updateTeams(+id, dto);
  }

  @Put(':id/result')
  @Roles(UserRole.SUPERADMIN)
  setResult(@Param('id') id: string, @Body() dto: SetResultDto) {
    return this.service.setResult(+id, dto);
  }
}
