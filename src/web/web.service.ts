import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../shared/prisma.service";
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { randomUUID } from "crypto";
import { RegistrationSource } from "@prisma/client";

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function getNextAvailableDate(matches: { date: string | null; finished: boolean }[], today: string): string | null {
  const tomorrow = getTomorrowDateString();
  const nextMatch = matches
    .filter((m) => !m.finished && m.date && m.date >= today && m.date <= tomorrow)
    .sort((a, b) => a.date!.localeCompare(b.date!))[0];
  return nextMatch?.date || null;
}

// ── Rate limiter simple (en memoria) ────────────────────────────────
const loginAttempts = new Map<string, { count: number; blockUntil: number }>();

function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && entry.blockUntil > now) {
    throw new HttpException(
      "Demasiados intentos. Intente nuevamente en 5 minutos.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (entry && entry.count >= 5) {
    loginAttempts.set(key, { count: 0, blockUntil: now + 5 * 60 * 1000 });
    throw new HttpException(
      "Demasiados intentos. Intente nuevamente en 5 minutos.",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

function recordAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry) {
    if (entry.blockUntil < now) {
      loginAttempts.set(key, { count: 1, blockUntil: 0 });
    } else {
      loginAttempts.set(key, {
        count: entry.count + 1,
        blockUntil: entry.blockUntil,
      });
    }
  } else {
    loginAttempts.set(key, { count: 1, blockUntil: 0 });
  }
}

function clearRateLimit(key: string): void {
  loginAttempts.delete(key);
}

// ── DTOs ────────────────────────────────────────────────────────────

export class CampaignByDomainDto {
  @IsString() domain!: string;
  @IsOptional() @IsString() slug?: string;
}

export class LoginDto {
  @IsString() code!: string;
  @IsString() password!: string;
  @IsNumber() campaign_id!: number;
  @IsOptional() @IsString() nombres?: string;
  @IsOptional() @IsString() apellidos?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefono?: string;
}

class PredictionItemDto {
  @IsNumber() match_id!: number;
  @IsNumber() goals_local!: number;
  @IsNumber() goals_visitor!: number;
}

export class SubmitPredictionsDto {
  @IsOptional() @IsString() champion_team?: string;
  @IsOptional() @IsString() prediction_date?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PredictionItemDto)
  predictions!: PredictionItemDto[];
}

// ── Service ─────────────────────────────────────────────────────────

@Injectable()
export class WebService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async campaignByDomain(domain: string, slug?: string) {
    // If a specific slug is provided (e.g. from env var in dev), use it directly
    if (slug) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          logo_url: true,
          web_bg_url: true,
          control_employees: true,
          active: true,
        },
      });
      if (!campaign || !campaign.active) {
        throw new NotFoundException("Campaña no encontrada o inactiva");
      }
      return campaign;
    }

    // Extract subdomain from domain
    // e.g., "empresax.mundial-polla.com" -> "empresax"
    const parts = domain.split(".");
    const subdomain = parts.length > 2 ? parts[0] : null;

    if (!subdomain) {
      // Try finding campaign by slug directly (for custom domains)
      const campaign = await this.prisma.campaign.findFirst({
        where: { active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          logo_url: true,
          web_bg_url: true,
          control_employees: true,
          active: true,
        },
      });
      if (!campaign) throw new NotFoundException("No hay campañas activas");
      return campaign;
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { slug: subdomain },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
        web_bg_url: true,
        control_employees: true,
        active: true,
      },
    });

    if (!campaign || !campaign.active) {
      throw new NotFoundException("Campaña no encontrada o inactiva");
    }

    return campaign;
  }

  async login(dto: LoginDto) {
    const ipKey = `login_${dto.campaign_id}_${dto.code}`;
    checkRateLimit(ipKey);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaign_id },
      select: { control_employees: true, active: true },
    });
    if (!campaign || !campaign.active) {
      throw new UnauthorizedException("Campaña no activa");
    }

    // Buscar empleado por código
    let employee = await this.prisma.employee.findUnique({
      where: {
        campaign_id_code: { campaign_id: dto.campaign_id, code: dto.code },
      },
    });

    if (employee) {
      if (!employee.password) {
        recordAttempt(ipKey);
        throw new UnauthorizedException(
          "No tienes una contraseña configurada. Contacta con tu administrador.",
        );
      }
      if (dto.password !== employee.password) {
        recordAttempt(ipKey);
        throw new UnauthorizedException(
          "Código de trabajador o contraseña incorrectos",
        );
      }
      if (!employee.active) {
        throw new UnauthorizedException("Trabajador desactivado");
      }
    } else if (campaign.control_employees) {
      recordAttempt(ipKey);
      throw new UnauthorizedException(
        "No hemos encontrado tu código de trabajador, contáctate con tu empresa para solucionarlo",
      );
    } else {
      employee = await this.prisma.employee.create({
        data: {
          code: dto.code,
          nombres: dto.nombres || dto.code,
          apellidos: dto.apellidos,
          email: dto.email,
          telefono: dto.telefono,
          campaign_id: dto.campaign_id,
          password: dto.password,
        },
      });
    }

    clearRateLimit(ipKey);
    const token = this.jwt.sign({
      sub: employee.id,
      type: "employee",
      campaign_id: employee.campaign_id,
    });
    return {
      access_token: token,
      employee: {
        id: employee.id,
        code: employee.code,
        nombres: employee.nombres,
        apellidos: employee.apellidos,
        email: employee.email,
        telefono: employee.telefono,
      },
    };
  }

  async getPhase(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, campaign_id: true },
    });
    if (!employee) throw new UnauthorizedException("Trabajador no encontrado");

    const phase = await this.prisma.phase.findFirst({
      where: {
        campaign_id: employee.campaign_id,
        active: true,
        published: true,
      },
      orderBy: { version: "desc" },
    });
    if (!phase) return { phase: null, matches: [], already_submitted: false };

    const allMatches = await this.prisma.match.findMany({
      where: { phase_id: phase.id },
      orderBy: { match_number: "asc" },
    });

    if (phase.daily_predictions) {
      const today = getTodayDateString();
      const nextDate = getNextAvailableDate(allMatches, today);

      const matches = nextDate
        ? allMatches.filter((m) => m.date === nextDate && !m.finished)
        : [];

      const existing = nextDate
        ? await this.prisma.registration.findFirst({
            where: { employee_id: employeeId, prediction_date: nextDate },
          })
        : null;

      return {
        phase: {
          id: phase.id,
          number: phase.number,
          name: phase.name,
          date_from: phase.date_from,
          date_to: phase.date_to,
          daily_predictions: true,
          predictions_required: phase.predictions_required,
          min_correct_to_win: phase.min_correct_to_win,
          version: phase.version,
        },
        matches,
        all_matches: allMatches,
        prediction_date: nextDate,
        already_submitted: !!existing,
      };
    }

    const existing = await this.prisma.registration.findFirst({
      where: { employee_id: employeeId, phase_id: phase.id, prediction_date: null },
    });

    return {
      phase: {
        id: phase.id,
        number: phase.number,
        name: phase.name,
        date_from: phase.date_from,
        date_to: phase.date_to,
        daily_predictions: false,
        predictions_required: phase.predictions_required,
        min_correct_to_win: phase.min_correct_to_win,
        version: phase.version,
      },
      matches: allMatches,
      all_matches: allMatches,
      already_submitted: !!existing,
    };
  }

  async submitPredictions(employeeId: string, dto: SubmitPredictionsDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, campaign_id: true },
    });
    if (!employee) throw new UnauthorizedException("Trabajador no encontrado");

    const phase = await this.prisma.phase.findFirst({
      where: {
        campaign_id: employee.campaign_id,
        active: true,
        published: true,
      },
    });
    if (!phase) throw new BadRequestException("No hay una fase activa");

    const predictionDate = dto.prediction_date || null;

    if (phase.daily_predictions) {
      const today = getTodayDateString();
      const allMatches = await this.prisma.match.findMany({
        where: { phase_id: phase.id },
      });
      const nextDate = getNextAvailableDate(allMatches, today);

      if (!nextDate) {
        throw new BadRequestException("No hay partidos disponibles para predecir");
      }

      if (!dto.prediction_date || dto.prediction_date !== nextDate) {
        throw new BadRequestException(
          `Solo puedes enviar predicciones para la fecha ${nextDate}`,
        );
      }

      const existing = await this.prisma.registration.findFirst({
        where: { employee_id: employeeId, prediction_date: nextDate },
      });
      if (existing)
        throw new ConflictException(
          "Ya enviaste tus predicciones para esta fecha.",
        );

      const matchesCount = await this.prisma.match.count({
        where: { phase_id: phase.id, date: nextDate, finished: false },
      });
      if (!dto.predictions || dto.predictions.length !== matchesCount) {
        throw new BadRequestException(
          `Debes predecir los ${matchesCount} partidos de esta fecha para poder enviar (completaste ${dto.predictions?.length || 0} de ${matchesCount}).`,
        );
      }

      const registration = await this.prisma.registration.create({
        data: {
          source: RegistrationSource.WEB,
          employee_id: employeeId,
          phase_id: phase.id,
          local_id: randomUUID(),
          prediction_date: nextDate,
          registered_at: new Date(),
          predictions: {
            create: dto.predictions.map((p) => ({
              match_id: p.match_id,
              goals_local: p.goals_local,
              goals_visitor: p.goals_visitor,
            })),
          },
        },
        include: { predictions: true },
      });

      return registration;
    }

    // Modo clásico
    const existing = await this.prisma.registration.findFirst({
      where: { employee_id: employeeId, phase_id: phase.id, prediction_date: null },
    });
    if (existing)
      throw new ConflictException(
        "Ya enviaste tus predicciones para esta fase",
      );

    if (
      !dto.predictions ||
      dto.predictions.length < phase.predictions_required
    ) {
      throw new BadRequestException(
        `Debes enviar al menos ${phase.predictions_required} predicciones`,
      );
    }

    const registration = await this.prisma.registration.create({
      data: {
        source: RegistrationSource.WEB,
        employee_id: employeeId,
        phase_id: phase.id,
        local_id: randomUUID(),
        champion_team: dto.champion_team || null,
        registered_at: new Date(),
        predictions: {
          create: dto.predictions.map((p) => ({
            match_id: p.match_id,
            goals_local: p.goals_local,
            goals_visitor: p.goals_visitor,
          })),
        },
      },
      include: { predictions: true },
    });

    return registration;
  }

  async myPredictions(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, campaign_id: true },
    });
    if (!employee) throw new UnauthorizedException("Trabajador no encontrado");

    const registrations = await this.prisma.registration.findMany({
      where: { employee_id: employeeId },
      include: {
        phase: { select: { id: true, name: true, number: true, daily_predictions: true } },
        predictions: {
          include: { match: true },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { registered_at: "desc" },
    });

    return registrations;
  }

  async getRanking(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, campaign_id: true },
    });
    if (!employee) throw new UnauthorizedException("Trabajador no encontrado");

    // Aggregate points across ALL phases of the campaign
    const result = await this.prisma.registration.groupBy({
      by: ["employee_id"],
      where: {
        source: RegistrationSource.WEB,
        phase: { campaign_id: employee.campaign_id },
      },
      _sum: { total_points: true },
      orderBy: { _sum: { total_points: "desc" } },
    });

    // Fetch employee codes for display
    const employeeIds = result.map((r) => r.employee_id).filter(Boolean) as string[];
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, code: true, nombres: true },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const ranking = result
      .filter((r) => r.employee_id)
      .map((r, i) => {
        const emp = empMap.get(r.employee_id!);
        return {
          position: i + 1,
          code: emp?.code || "—",
          nombres: emp?.nombres || "—",
          total_points: r._sum.total_points || 0,
        };
      })
      .sort((a, b) => b.total_points - a.total_points || a.code.localeCompare(b.code))
      .map((r, i) => ({ ...r, position: i + 1 }));

    return { ranking, phase: null };
  }

  async getInstructions() {
    return {
      instructions: [
        "Ingresa con tu código de trabajador y la contraseña que te proporcionó tu empresa.",
        "La contraseña es de uso personal e intransferible. No la compartas con nadie.",
        "El manejo y custodia de tu contraseña es tu completa responsabilidad.",
        "Cada día podrás predecir los marcadores de los partidos del día siguiente.",
        "Mínimo 1 predicción, máximo la cantidad de partidos programados para ese día.",
        "Solo puedes enviar una predicción por día. Los partidos del día de hoy no están disponibles.",
        "Puntaje: 2 puntos por marcador exacto, 1 punto por resultado correcto (ganador o empate).",
        "Los resultados se actualizan diariamente y el ranking se recalcula automáticamente.",
        "En caso de empate en puntos, se ordena por código de trabajador.",
        "Al confirmar y enviar las predicciones, ya no podrás modificarlas. Antes de confirmar asegúrate de tener todas las predicciones que desees.",
      ],
    };
  }

  async writeLog(
    employeeId: string,
    logData: { action: string; metadata?: any },
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) return;
    return { ok: true };
  }
}
