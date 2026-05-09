// sync.controller.ts
import { Controller, Post, Get, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { SyncService } from './sync.service';

// No JWT — tótems use their own totem_code + secret_key authentication
@Controller('sync')
export class SyncController {
  constructor(private service: SyncService) {}

  @Post('heartbeat')
  heartbeat(@Body() body: { totem_code: string; version_data: number }) {
    return this.service.heartbeat(body.totem_code, body.version_data);
  }

  @Get('data/:totem_code')
  getData(
    @Param('totem_code') totem_code: string,
    @Query('version') version: string,
    @Query('phase_id') phase_id?: string,
  ) {
    return this.service.getData(totem_code, parseInt(version) || 0, phase_id ? parseInt(phase_id) : undefined);
  }

  @Get('factura/:totem_code/:factura')
  checkFactura(
    @Param('totem_code') totem_code: string,
    @Param('factura') factura: string,
  ) {
    return this.service.checkFactura(totem_code, factura);
  }

  @Post('push/:totem_code')
  pushRegistrations(
    @Param('totem_code') totem_code: string,
    @Body() body: { registrations: any[] },
  ) {
    return this.service.pushRegistrations(totem_code, body.registrations);
  }
}
