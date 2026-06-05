import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { EmployeesService, CreateEmployeeDto, UpdateEmployeeDto, BulkCreateEmployeeDto } from './employees.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../shared/guards/roles.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
export class EmployeesController {
  constructor(private service: EmployeesService) {}

  @Get()
  findAll(@Request() req, @Query('campaign_id') cid?: string) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : (cid ? +cid : undefined);
    return this.service.findAll(campaign_id);
  }

  @Post('bulk')
  @Roles(UserRole.SUPERADMIN)
  bulkCreate(@Body() dto: BulkCreateEmployeeDto) {
    return this.service.bulkCreate(dto.codes, dto.campaign_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateEmployeeDto) {
    if (req.user.role === UserRole.CAMPAIGN_ADMIN) {
      dto.campaign_id = req.user.campaign_id;
    }
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  resetPassword(@Param('id') id: string) {
    return this.service.resetPassword(id);
  }

  @Post('cleanup-duplicates')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  cleanupDuplicates(@Request() req, @Body('campaign_id') cid?: number) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : cid;
    if (!campaign_id) throw new BadRequestException('campaign_id es requerido');
    return this.service.cleanupDuplicates(campaign_id);
  }

  @Post('export-passwords')
  @Roles(UserRole.SUPERADMIN, UserRole.CAMPAIGN_ADMIN)
  exportPasswords(@Request() req, @Body('campaign_id') cid?: number) {
    const campaign_id = req.user.role === UserRole.CAMPAIGN_ADMIN ? req.user.campaign_id : cid;
    if (!campaign_id) throw new BadRequestException('campaign_id es requerido');
    return this.service.exportPasswords(campaign_id);
  }
}
