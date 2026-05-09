import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../shared/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, active: true },
      include: { campaign: true },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');
    const payload = { sub: user.id, email: user.email, role: user.role, campaign_id: user.campaign_id };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, campaign_id: user.campaign_id, nombres: user.nombres, campaign: user.campaign },
    };
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId }, include: { campaign: true } });
  }
}
