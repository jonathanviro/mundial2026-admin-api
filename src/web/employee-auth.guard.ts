import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('Token requerido');

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET') || 'mundial2026_secret',
      });
      if (payload.type !== 'employee') throw new UnauthorizedException('Token inválido');
      request.employee = { id: payload.sub, campaign_id: payload.campaign_id };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
