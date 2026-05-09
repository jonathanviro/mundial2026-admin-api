import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() password: string;
  @IsString() nombres: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsNumber() campaign_id?: number;
}

export class UpdateUserDto {
  @IsOptional() @IsString() nombres?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() active?: boolean;
  @IsOptional() @IsNumber() campaign_id?: number;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(campaign_id?: number) {
    return this.prisma.user.findMany({
      where: campaign_id ? { campaign_id } : {},
      include: { campaign: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: await bcrypt.hash(dto.password, 10),
        nombres: dto.nombres,
        role: dto.role || UserRole.CAMPAIGN_ADMIN,
        campaign_id: dto.campaign_id || null,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const data: any = { ...dto };
    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async seedSuperadmin() {
    const existing = await this.prisma.user.findFirst({ where: { role: UserRole.SUPERADMIN } });
    if (existing) return { message: 'Superadmin ya existe', email: existing.email };
    const user = await this.prisma.user.create({
      data: {
        email: process.env.SUPERADMIN_EMAIL || 'admin@mundial2026.com',
        password_hash: await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'Admin2026!', 10),
        nombres: 'Super Admin',
        role: UserRole.SUPERADMIN,
      },
    });
    return { message: 'Superadmin creado', email: user.email };
  }
}
