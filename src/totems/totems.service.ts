import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTotemDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() location?: string;
  @IsNumber() campaign_id!: number;
}

export class UpdateTotemDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() active?: boolean;
}

@Injectable()
export class TotemsService {
  constructor(private prisma: PrismaService) {}

  findAll(campaign_id?: number) {
    return this.prisma.totem.findMany({
      where: campaign_id ? { campaign_id } : {},
      include: { campaign: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  findByCode(code: string) {
    return this.prisma.totem.findUnique({ where: { code } });
  }

  async create(dto: CreateTotemDto) {
    const existing = await this.prisma.totem.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('El código de tótem ya existe');
    return this.prisma.totem.create({
      data: { ...dto, secret_key: `sk_${dto.code}_${Date.now()}` },
    });
  }

  async update(id: number, dto: UpdateTotemDto) {
    const totem = await this.prisma.totem.findUnique({ where: { id } });
    if (!totem) throw new NotFoundException('Tótem no encontrado');
    return this.prisma.totem.update({ where: { id }, data: dto });
  }

  async updateHeartbeat(id: number, version_data: number) {
    return this.prisma.totem.update({
      where: { id },
      data: { last_heartbeat: new Date(), version_data },
    });
  }

  async updateSync(id: number, version_data: number) {
    return this.prisma.totem.update({
      where: { id },
      data: { last_sync: new Date(), last_heartbeat: new Date(), version_data },
    });
  }

  async getDashboardStatus(campaign_id?: number) {
    const totems = await this.findAll(campaign_id);
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    return totems.map((t) => ({
      ...t,
      online: !!(t.last_heartbeat && t.last_heartbeat > fiveMinAgo),
    }));
  }
}
