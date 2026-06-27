import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateMatchDto {
  @IsNumber() phase_id!: number;
  @IsNumber() match_number!: number;
  @IsOptional() @IsString() group_name?: string;
  @IsOptional() @IsString() team_local?: string;
  @IsOptional() @IsString() team_visitor?: string;
  @IsOptional() @IsString() date?: string;
}

export class SetResultDto {
  @IsNumber() goals_local!: number;
  @IsNumber() goals_visitor!: number;
}

export class UpdateMatchTeamsDto {
  @IsString() team_local!: string;
  @IsString() team_visitor!: string;
  @IsOptional() @IsString() date?: string;
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

    const gl = dto.goals_local;
    const gv = dto.goals_visitor;
    const homeWins = gl > gv;
    const awayWins = gv > gl;
    const draw = gl === gv;

    // Save result
    await this.prisma.match.update({
      where: { id },
      data: { goals_local: gl, goals_visitor: gv, finished: true },
    });

    // Increment phase version so totems detect changes
    await this.prisma.phase.update({
      where: { id: match.phase_id },
      data: { version: { increment: 1 } },
    });

    // Evaluate predictions for this match
    const predictions = await this.prisma.prediction.findMany({ where: { match_id: id } });
    let exactMatches = 0;
    let resultPoints = 0;

    for (const pred of predictions) {
      const predHomeWins = pred.goals_local > pred.goals_visitor;
      const predAwayWins = pred.goals_visitor > pred.goals_local;
      const predDraw = pred.goals_local === pred.goals_visitor;

      const exactScore = pred.goals_local === gl && pred.goals_visitor === gv;
      const correctResult = (homeWins && predHomeWins) || (awayWins && predAwayWins) || (draw && predDraw);

      let points = 0;
      if (exactScore) { points = 2; exactMatches++; }
      else if (correctResult) { points = 1; resultPoints++; }

      await this.prisma.prediction.update({
        where: { id: pred.id },
        data: { is_correct: exactScore, points },
      });
    }

    // Recalculate totals for all registrations in this phase
    await this.recalculateWinners(match.phase_id, match.phase.min_correct_to_win);

    return { match_id: id, predictions_evaluated: predictions.length, exact_matches: exactMatches, correct_results: resultPoints };
  }

  private async recalculateWinners(phase_id: number, min_correct: number) {
    const registrations = await this.prisma.registration.findMany({
      where: { phase_id },
      include: { predictions: true },
    });
    for (const reg of registrations) {
      const correct = reg.predictions.filter(p => p.is_correct).length;
      const total_points = reg.predictions.reduce((sum, p) => sum + p.points, 0);
      await this.prisma.registration.update({
        where: { id: reg.id },
        data: { correct_predictions: correct, total_points, is_winner: correct >= min_correct },
      });
    }
  }

  async finish(id: number) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    await this.prisma.match.update({
      where: { id },
      data: { finished: true },
    });
    await this.prisma.phase.update({
      where: { id: match.phase_id },
      data: { version: { increment: 1 } },
    });
    return { match_id: id, finished: true };
  }

  async resetMatch(id: number) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { phase: true },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');

    await this.prisma.match.update({
      where: { id },
      data: { goals_local: null, goals_visitor: null, finished: false },
    });

    await this.prisma.prediction.updateMany({
      where: { match_id: id },
      data: { is_correct: false, points: 0 },
    });

    await this.recalculateWinners(match.phase_id, match.phase.min_correct_to_win);

    await this.prisma.phase.update({
      where: { id: match.phase_id },
      data: { version: { increment: 1 } },
    });

    return { match_id: id, finished: false, predictions_reset: true };
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
