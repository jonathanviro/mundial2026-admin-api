import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class ParticipantsService {
  constructor(private prisma: PrismaService) {}

  findAll(campaign_id: number, search?: string) {
    return this.prisma.participant.findMany({
      where: {
        campaign_id,
        ...(search ? {
          OR: [
            { cedula: { contains: search, mode: 'insensitive' } },
            { nombres: { contains: search, mode: 'insensitive' } },
            { apellidos: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { _count: { select: { registrations: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  stats(campaign_id: number) {
    return this.prisma.participant.count({ where: { campaign_id } });
  }
}
