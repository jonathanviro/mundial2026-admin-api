import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../shared/prisma.service";
import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";
import { Type } from "class-transformer";

export class CreateEmployeeDto {
  @IsString() code!: string;
  @IsString() nombres!: string;
  @IsOptional() @IsString() apellidos?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() factura?: string;
  @IsNumber() campaign_id!: number;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() nombres?: string;
  @IsOptional() @IsString() apellidos?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() factura?: string;
  @IsOptional() active?: boolean;
}

export class BulkCreateEmployeeDto {
  @IsArray()
  @IsString({ each: true })
  codes!: string[];

  @IsNumber()
  campaign_id!: number;
}

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll(campaign_id?: number) {
    return this.prisma.employee.findMany({
      where: campaign_id ? { campaign_id } : {},
      include: { campaign: { select: { id: true, name: true } } },
      orderBy: { created_at: "desc" },
    });
  }

  findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: { campaign: { select: { id: true, name: true } } },
    });
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: {
        campaign_id_code: { campaign_id: dto.campaign_id, code: dto.code },
      },
    });
    if (existing)
      throw new ConflictException(
        "El código de trabajador ya existe en esta campaña",
      );
    return this.prisma.employee.create({ data: dto });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException("Trabajador no encontrado");
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException("Trabajador no encontrado");
    await this.prisma.employee.update({
      where: { id },
      data: { active: false },
    });
    return { message: "Trabajador desactivado" };
  }

  async bulkCreate(codes: string[], campaign_id: number) {
    let created = 0;
    let skipped = 0;
    const errors: { code: string; reason: string }[] = [];

    for (const code of codes) {
      try {
        const exists = await this.prisma.employee.findUnique({
          where: {
            campaign_id_code: { campaign_id, code },
          },
        });
        if (exists) {
          skipped++;
          continue;
        }
        await this.prisma.employee.create({
          data: { code, nombres: code, campaign_id },
        });
        created++;
      } catch (err: any) {
        errors.push({
          code,
          reason: err.message || "Error desconocido",
        });
      }
    }

    return {
      created,
      skipped,
      total: codes.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
