// users.controller.ts
import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../shared/guards/roles.guard';
import { UserRole } from '../shared/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  findAll(@Query('campaign_id') campaign_id?: string) {
    return this.service.findAll(campaign_id ? +campaign_id : undefined);
  }

  @Post()
  create(@Body() dto: CreateUserDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(+id, dto);
  }

  @Post('seed-superadmin')
  seed() { return this.service.seedSuperadmin(); }
}
