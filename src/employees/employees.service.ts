import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../shared/prisma.service";
import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";
import { randomBytes } from "crypto";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 8): string {
  let password = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return password;
}

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
    const password = generatePassword();
    const employee = await this.prisma.employee.create({
      data: { ...dto, password },
    });
    return { ...employee, password_generated: password };
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
    const passwords: { code: string; password: string }[] = [];
    let created = 0;
    let skipped = 0;

    const existing = await this.prisma.employee.findMany({
      where: { campaign_id, code: { in: codes } },
      select: { code: true },
    });
    const existingSet = new Set(existing.map((e) => e.code));
    const newCodes = codes.filter((c) => {
      if (existingSet.has(c)) { skipped++; return false; }
      return true;
    });

    const employeesData: {
      code: string;
      nombres: string;
      campaign_id: number;
      password: string;
    }[] = [];

    for (const code of newCodes) {
      const password = generatePassword();
      passwords.push({ code, password });
      employeesData.push({ code, nombres: code, campaign_id, password });
    }

    if (employeesData.length > 0) {
      created = employeesData.length;
      const chunkSize = 100;
      for (let i = 0; i < employeesData.length; i += chunkSize) {
        await this.prisma.employee.createMany({
          data: employeesData.slice(i, i + chunkSize),
        });
      }
    }

    return {
      created,
      skipped,
      total: codes.length,
      passwords: passwords.length > 0 ? passwords : undefined,
    };
  }

  async cleanupDuplicates(campaign_id: number) {
    const all = await this.prisma.employee.findMany({
      where: { campaign_id },
      orderBy: { created_at: "asc" },
      select: { id: true, code: true, created_at: true },
    });

    const seen = new Set<string>();
    const toDeactivate: string[] = [];

    for (const emp of all) {
      if (seen.has(emp.code)) {
        toDeactivate.push(emp.id);
      } else {
        seen.add(emp.code);
      }
    }

    if (toDeactivate.length > 0) {
      await this.prisma.employee.updateMany({
        where: { id: { in: toDeactivate } },
        data: { active: false },
      });
    }

    return { duplicates_removed: toDeactivate.length, total_kept: seen.size };
  }

  async resetPassword(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException("Trabajador no encontrado");
    const password = generatePassword();
    await this.prisma.employee.update({
      where: { id },
      data: { password },
    });
    return { password };
  }

  async exportPasswords(campaign_id: number) {
    return this.prisma.employee.findMany({
      where: { campaign_id, active: true, password: { not: null } },
      select: { code: true, nombres: true, password: true },
    });
  }
}
