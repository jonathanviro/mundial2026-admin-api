import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { IsString, IsOptional } from 'class-validator';

export class CreateCampaignDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsString() bg_screen1_url?: string;
  @IsOptional() @IsString() bg_screen2_url?: string;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsString() bg_screen1_url?: string;
  @IsOptional() @IsString() bg_screen2_url?: string;
  @IsOptional() active?: boolean;
}

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.campaign.findMany({ orderBy: { created_at: 'desc' } });
  }

  findOne(id: number) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { totems: true, users: { select: { id: true, email: true, nombres: true, role: true, active: true } } },
    });
  }

  async create(dto: CreateCampaignDto) {
    const existing = await this.prisma.campaign.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('El slug ya existe');
    return this.prisma.campaign.create({ data: dto });
  }

  async update(id: number, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaña eliminada' };
  }
}
