import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateMatchDto {
  @IsNumber() phase_id!: number;
  @IsNumber() match_number!: number;
  @IsOptional() @IsString() group_name?: string;
  @IsOptional() @IsString() team_local?: string;
  @IsOptional() @IsString() team_visitor?: string;
}

export class SetResultDto {
  @IsNumber() goals_local!: number;
  @IsNumber() goals_visitor!: number;
}

export class UpdateMatchTeamsDto {
  @IsString() team_local!: string;
  @IsString() team_visitor!: string;
}

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  findByPhase(phase_id: number) {
    return this.prisma.match.findMany({
      where: { phase_id },
      orderBy: { match_number: 'asc' },
    });
  }

  async create(dto: CreateMatchDto) {
    const match = await this.prisma.match.create({ data: dto });
    await this.prisma.phase.update({ where: { id: dto.phase_id }, data: { version: { increment: 1 } } });
    return match;
  }

  async updateTeams(id: number, dto: UpdateMatchTeamsDto) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    const updated = await this.prisma.match.update({ where: { id }, data: dto });
    await this.prisma.phase.update({ where: { id: match.phase_id }, data: { version: { increment: 1 } } });
    return updated;
  }

  async setResult(id: number, dto: SetResultDto) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { phase: true },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');

    // Save result
    await this.prisma.match.update({
      where: { id },
      data: { goals_local: dto.goals_local, goals_visitor: dto.goals_visitor, finished: true },
    });

    // Evaluate predictions for this match
    const predictions = await this.prisma.prediction.findMany({ where: { match_id: id } });
    let correct = 0;
    for (const pred of predictions) {
      const isCorrect = pred.goals_local === dto.goals_local && pred.goals_visitor === dto.goals_visitor;
      if (isCorrect) correct++;
      await this.prisma.prediction.update({ where: { id: pred.id }, data: { is_correct: isCorrect } });
    }

    // Recalculate winners for all registrations in this phase
    await this.recalculateWinners(match.phase_id, match.phase.min_correct_to_win);

    return { match_id: id, predictions_evaluated: predictions.length, correct };
  }

  private async recalculateWinners(phase_id: number, min_correct: number) {
    const registrations = await this.prisma.registration.findMany({
      where: { phase_id },
      include: { predictions: true },
    });
    for (const reg of registrations) {
      const correct = reg.predictions.filter(p => p.is_correct).length;
      await this.prisma.registration.update({
        where: { id: reg.id },
        data: { correct_predictions: correct, is_winner: correct >= min_correct },
      });
    }
  }

  async bulkCreate(matches: CreateMatchDto[]) {
    const created = await this.prisma.match.createMany({ data: matches, skipDuplicates: true });
    if (matches.length > 0) {
      await this.prisma.phase.update({
        where: { id: matches[0].phase_id },
        data: { version: { increment: 1 } },
      });
    }
    return { created: created.count };
  }
}
