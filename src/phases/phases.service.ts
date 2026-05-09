import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../shared/prisma.service";
import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreatePhaseDto {
  @IsNumber() campaign_id: number;
  @IsNumber() number: number;
  @IsString() name: string;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
  @IsOptional() @IsNumber() predictions_required?: number;
  @IsOptional() @IsNumber() min_correct_to_win?: number;
}

export interface PhaseRule {
  name: string;
  predictions_required: number;
  min_correct_to_win: number;
  matches: number;
  qualified_from_previous: number;
}

export class QualifiedTeamDto {
  @IsString() team: string;
}

export class MatchupDto {
  @IsOptional() match_number?: number;
  @IsString() team_local: string;
  @IsString() team_visitor: string;
}

export class GenerateNextPhaseDto {
  @IsNumber() current_phase_id: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualifiedTeamDto)
  qualified_teams: QualifiedTeamDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchupDto)
  matchups?: MatchupDto[];
  @IsOptional() @IsNumber() predictions_required?: number;
  @IsOptional() @IsNumber() min_correct_to_win?: number;
}

const PHASE_RULES: Record<
  number,
  PhaseRule & { matches: number; qualified_from_previous: number }
> = {
  1: {
    name: "Fase de Grupos",
    predictions_required: 3,
    min_correct_to_win: 3,
    matches: 72,
    qualified_from_previous: 48,
  },
  2: {
    name: "Dieciseisavos de Final",
    predictions_required: 16,
    min_correct_to_win: 3,
    matches: 16,
    qualified_from_previous: 32,
  },
  3: {
    name: "Octavos de Final",
    predictions_required: 8,
    min_correct_to_win: 2,
    matches: 8,
    qualified_from_previous: 16,
  },
  4: {
    name: "Cuartos de Final",
    predictions_required: 4,
    min_correct_to_win: 2,
    matches: 4,
    qualified_from_previous: 8,
  },
  5: {
    name: "Semifinales",
    predictions_required: 2,
    min_correct_to_win: 2,
    matches: 2,
    qualified_from_previous: 4,
  },
  6: {
    name: "Final",
    predictions_required: 1,
    min_correct_to_win: 1,
    matches: 1,
    qualified_from_previous: 2,
  },
};

@Injectable()
export class PhasesService {
  constructor(private prisma: PrismaService) {}

  findAll(campaign_id?: number) {
    return this.prisma.phase.findMany({
      where: campaign_id ? { campaign_id } : {},
      include: { _count: { select: { matches: true } } },
      orderBy: { number: "asc" },
    });
  }

  findActive(campaign_id: number) {
    return this.prisma.phase.findFirst({
      where: { campaign_id, active: true, published: true },
      include: { matches: { orderBy: { match_number: "asc" } } },
      orderBy: { number: "desc" },
    });
  }

  create(dto: CreatePhaseDto) {
    const rules: Partial<PhaseRule> = PHASE_RULES[dto.number] || {};
    return this.prisma.phase.create({
      data: {
        campaign_id: dto.campaign_id,
        number: dto.number,
        name: dto.name || rules.name || `Fase ${dto.number}`,
        date_from: dto.date_from,
        date_to: dto.date_to,
        predictions_required:
          dto.predictions_required ?? rules.predictions_required ?? 3,
        min_correct_to_win:
          dto.min_correct_to_win ?? rules.min_correct_to_win ?? 1,
        published: false,
        active: false,
      },
    });
  }

  async publish(id: number) {
    const phase = await this.prisma.phase.findUnique({ where: { id } });
    if (!phase) throw new NotFoundException("Fase no encontrada");
    // Deactivate all phases of this campaign
    await this.prisma.phase.updateMany({
      where: { campaign_id: phase.campaign_id },
      data: { active: false },
    });
    // Get the MAX version from ALL phases in this campaign
    const maxVersionPhase = await this.prisma.phase.findFirst({
      where: { campaign_id: phase.campaign_id },
      orderBy: { version: "desc" },
    });
    const newVersion = (maxVersionPhase?.version || 0) + 1;
    return this.prisma.phase.update({
      where: { id },
      data: { published: true, active: true, version: newVersion },
    });
  }

  async unpublish(id: number) {
    const phase = await this.prisma.phase.findUnique({ where: { id } });
    if (!phase) throw new NotFoundException("Fase no encontrada");
    return this.prisma.phase.update({ where: { id }, data: { active: false } });
  }

  getPhaseRules() {
    return PHASE_RULES;
  }

  async getStandings(phase_id: number) {
    const phase = await this.prisma.phase.findUnique({
      where: { id: phase_id },
    });
    if (!phase) throw new NotFoundException("Fase no encontrada");

    // Only group stage (phase 1) has standings
    if (phase.number !== 1) {
      return {
        message: "Las fases eliminatorias no tienen tabla de posiciones",
      };
    }

    const matches = await this.prisma.match.findMany({
      where: { phase_id, finished: true },
      orderBy: { match_number: "asc" },
    });

    // Group by group_name
    const groups: Record<string, string[]> = {};
    matches.forEach((m) => {
      const group = m.group_name || "Unknown";
      if (!groups[group]) groups[group] = [];
      if (m.team_local && !groups[group].includes(m.team_local!))
        groups[group].push(m.team_local!);
      if (m.team_visitor && !groups[group].includes(m.team_visitor!))
        groups[group].push(m.team_visitor!);
    });

    const standings: Record<string, any[]> = {};

    for (const group of Object.keys(groups)) {
      const teams = groups[group];
      const teamStats: Record<string, any> = {};

      // Initialize stats
      teams.forEach((team) => {
        teamStats[team] = {
          team,
          flag: "", // Will be filled from match data
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
        };
      });

      // Process finished matches for this group
      const groupMatches = matches.filter(
        (m) => m.group_name === group && m.finished,
      );
      for (const m of groupMatches) {
        if (m.goals_local === null || m.goals_visitor === null) continue;

        const tl = m.team_local!;
        const tv = m.team_visitor!;
        const gl = m.goals_local;
        const gv = m.goals_visitor;

        teamStats[tl].played++;
        teamStats[tv].played++;

        teamStats[tl].gf += gl;
        teamStats[tl].ga += gv;
        teamStats[tv].gf += gv;
        teamStats[tv].ga += gl;

        teamStats[tl].gd = teamStats[tl].gf - teamStats[tl].ga;
        teamStats[tv].gd = teamStats[tv].gf - teamStats[tv].ga;

        if (gl > gv) {
          teamStats[tl].wins++;
          teamStats[tl].points += 3;
          teamStats[tv].losses++;
        } else if (gl < gv) {
          teamStats[tv].wins++;
          teamStats[tv].points += 3;
          teamStats[tl].losses++;
        } else {
          teamStats[tl].draws++;
          teamStats[tl].points += 1;
          teamStats[tv].draws++;
          teamStats[tv].points += 1;
        }
      }

      // Sort: Points > Goal Difference > Goals For
      const sorted = Object.values(teamStats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      standings[group] = sorted;
    }

    return standings;
  }

  async generateNextPhase(dto: GenerateNextPhaseDto) {
    const currentPhase = await this.prisma.phase.findUnique({
      where: { id: dto.current_phase_id },
    });
    if (!currentPhase) throw new NotFoundException("Fase actual no encontrada");

    const nextNumber = currentPhase.number + 1;
    const rules: PhaseRule = PHASE_RULES[nextNumber] || {
      name: `Fase ${nextNumber}`,
      predictions_required: 3,
      min_correct_to_win: 1,
      matches: 0,
      qualified_from_previous: 0,
    };

    if (!dto.qualified_teams || dto.qualified_teams.length < 2) {
      throw new Error("Debe proporcionar al menos 2 equipos clasificados");
    }

    // Calculate expected matches for this phase
    const expectedMatches = this.getExpectedMatchesForPhase(nextNumber);

    // Create next phase
    const nextPhase = await this.prisma.phase.create({
      data: {
        campaign_id: currentPhase.campaign_id,
        number: nextNumber,
        name: rules.name,
        predictions_required:
          dto.predictions_required ?? rules.predictions_required,
        min_correct_to_win: dto.min_correct_to_win ?? rules.min_correct_to_win,
        published: false,
        active: false,
      },
    });

    // Generate matches from matchups provided by frontend
    let matches: any[] = [];

    if (dto.matchups && dto.matchups.length > 0) {
      // Validate matchups count matches expected
      if (dto.matchups.length !== expectedMatches) {
        throw new Error(
          `Fase ${nextNumber} requiere ${expectedMatches} partidos, pero se enviaron ${dto.matchups.length}`,
        );
      }

      // Determine start number for auto-assignment
      const lastMatch = await this.prisma.match.findFirst({
        where: { phase_id: currentPhase.id },
        orderBy: { match_number: "desc" },
      });
      let startNumber = lastMatch ? lastMatch.match_number + 1 : 1;

      matches = dto.matchups.map((m, index) => ({
        phase_id: nextPhase.id,
        match_number: m.match_number ?? startNumber + index,
        team_local: m.team_local,
        team_visitor: m.team_visitor,
        finished: false,
      }));
    } else if (dto.qualified_teams && dto.qualified_teams.length >= 2) {
      // Auto-generate sequential matchups from qualified teams (fallback)
      const lastMatch = await this.prisma.match.findFirst({
        where: { phase_id: currentPhase.id },
        orderBy: { match_number: "desc" },
      });
      let startNumber = lastMatch ? lastMatch.match_number + 1 : 1;

      for (let i = 0; i < dto.qualified_teams.length; i += 2) {
        if (i + 1 < dto.qualified_teams.length) {
          matches.push({
            phase_id: nextPhase.id,
            match_number: startNumber + Math.floor(i / 2),
            team_local: dto.qualified_teams[i].team,
            team_visitor: dto.qualified_teams[i + 1].team,
            finished: false,
          });
        }
      }
    }

    if (matches.length > 0) {
      await this.prisma.match.createMany({ data: matches });
    }

    return {
      phase: nextPhase,
      matches_created: matches.length,
      total_qualified: dto.qualified_teams.length,
    };
  }

  private getExpectedMatchesForPhase(phaseNumber: number): number {
    const matchCounts: Record<number, number> = {
      1: 72, // Grupos: 12 grupos × 6 partidos
      2: 16, // 16avos
      3: 8, // 8vos
      4: 4, // 4tos
      5: 2, // Semis
      6: 1, // Final
    };
    return matchCounts[phaseNumber] || 0;
  }
}
