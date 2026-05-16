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

    if (campaign.control_employees) {
      // Solo trabajadores pre-registrados
      const employee = await this.prisma.employee.findUnique({
        where: {
          campaign_id_code: { campaign_id: dto.campaign_id, code: dto.code },
        },
      });
      if (!employee || !employee.active) {
        recordAttempt(ipKey);
        throw new UnauthorizedException(
          "No hemos encontrado tu código de trabajador, contáctate con tu empresa para solucionarlo",
        );
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

    // Modo abierto: auto-crear o login
    let employee = await this.prisma.employee.findUnique({
      where: {
        campaign_id_code: { campaign_id: dto.campaign_id, code: dto.code },
      },
    });

    if (!employee) {
      // Auto-crear
      employee = await this.prisma.employee.create({
        data: {
          code: dto.code,
          nombres: dto.nombres || dto.code,
          apellidos: dto.apellidos,
          email: dto.email,
          telefono: dto.telefono,
          campaign_id: dto.campaign_id,
        },
      });
    } else if (!employee.active) {
      throw new UnauthorizedException("Trabajador desactivado");
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

    const matches = await this.prisma.match.findMany({
      where: { phase_id: phase.id },
      orderBy: { match_number: "asc" },
    });

    const existing = await this.prisma.registration.findUnique({
      where: {
        employee_id_phase_id: { employee_id: employeeId, phase_id: phase.id },
      },
    });

    return {
      phase: {
        id: phase.id,
        number: phase.number,
        name: phase.name,
        date_from: phase.date_from,
        date_to: phase.date_to,
        predictions_required: phase.predictions_required,
        min_correct_to_win: phase.min_correct_to_win,
        version: phase.version,
      },
      matches,
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

    // Verificar que no haya enviado ya predicciones para esta fase
    const existing = await this.prisma.registration.findUnique({
      where: {
        employee_id_phase_id: { employee_id: employeeId, phase_id: phase.id },
      },
    });
    if (existing)
      throw new ConflictException(
        "Ya enviaste tus predicciones para esta fase",
      );

    // Validar que envió suficientes predicciones
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
        phase: { select: { id: true, name: true, number: true } },
        predictions: { include: { match: true } },
      },
      orderBy: { registered_at: "desc" },
    });

    return registrations;
  }

  async writeLog(
    employeeId: string,
    logData: { action: string; metadata?: any },
  ) {
    // Store in a simple structure - can be extended
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) return;
    // Log entries are stored via the RegistrationsService or can be saved
    // For simplicity, we return ok
    return { ok: true };
  }
}
