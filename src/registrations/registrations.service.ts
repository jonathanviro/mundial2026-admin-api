import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import * as ExcelJS from 'exceljs';
import type { RegistrationSource } from '@prisma/client';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(campaign_id?: number, phase_id?: number, totem_id?: number, source?: RegistrationSource, page = 1, limit = 50, search?: string, sortBy = 'registered_at', sortOrder: 'asc' | 'desc' = 'desc') {
    const campaignFilter = campaign_id
      ? { OR: [
          { totem: { campaign_id } },
          { employee: { campaign_id } },
        ] }
      : {};
    const where: any = {
      ...(campaign_id ? campaignFilter : {}),
      ...(phase_id ? { phase_id } : {}),
      ...(totem_id ? { totem_id } : {}),
      ...(source ? { source } : {}),
    };
    if (search) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { employee: { code: { contains: search, mode: 'insensitive' } } },
        { employee: { nombres: { contains: search, mode: 'insensitive' } } },
        { employee: { apellidos: { contains: search, mode: 'insensitive' } } },
        { participant: { nombres: { contains: search, mode: 'insensitive' } } },
        { participant: { apellidos: { contains: search, mode: 'insensitive' } } },
        { factura: { contains: search } },
      ];
    }

    const sortMap: Record<string, any> = {
      code:        { employee: { code: sortOrder } },
      nombres:     { employee: { nombres: sortOrder } },
      factura:     { factura: sortOrder },
      prediction_date: { prediction_date: sortOrder },
      correct_predictions: { correct_predictions: sortOrder },
      total_points: { total_points: sortOrder },
      registered_at: { registered_at: sortOrder },
      phase:       { phase: { name: sortOrder } },
      cedula:      { participant: { cedula: sortOrder } },
    };

    const orderBy = sortMap[sortBy] || { registered_at: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.registration.findMany({
        where,
        include: {
          participant: true,
          totem: { select: { id: true, name: true, code: true } },
          employee: { select: { id: true, code: true, nombres: true, apellidos: true, email: true, telefono: true } },
          phase: { select: { id: true, name: true, number: true } },
          _count: { select: { predictions: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.registration.count({ where }),
    ]);
    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getPredictions(id: number) {
    return this.prisma.prediction.findMany({
      where: { registration_id: id },
      include: { match: true },
    });
  }

  findWinners(campaign_id?: number, phase_id?: number) {
    // Support both totem and web winners
    const campaignFilter = campaign_id
      ? { OR: [
          { totem: { campaign_id } },
          { employee: { campaign_id } },
        ] }
      : {};

    return this.prisma.registration.findMany({
      where: {
        is_winner: true,
        ...(Object.keys(campaignFilter).length ? campaignFilter : {}),
        ...(phase_id ? { phase_id } : {}),
      },
      include: {
        participant: true,
        totem: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, code: true, nombres: true, apellidos: true } },
        phase: { select: { id: true, name: true } },
      },
      orderBy: { correct_predictions: 'desc' },
    });
  }

  async stats(campaign_id?: number) {
    // Count both totem and web registrations for this campaign
    const campaignFilter = campaign_id
      ? { OR: [
          { totem: { campaign_id } },
          { employee: { campaign_id } },
        ] }
      : {};
    const whereClause = Object.keys(campaignFilter).length ? campaignFilter : {};

    const [total, winners] = await Promise.all([
      this.prisma.registration.count({ where: whereClause }),
      this.prisma.registration.count({ where: { ...whereClause, is_winner: true } }),
    ]);
    return { total_registrations: total, total_winners: winners };
  }

  async exportExcel(campaign_id: number, phase_id?: number, totem_id?: number): Promise<Buffer> {
    const campaignFilter = campaign_id
      ? { OR: [{ totem: { campaign_id } }, { employee: { campaign_id } }] }
      : {};
    const registrations = await this.prisma.registration.findMany({
      where: {
        ...(campaign_id ? campaignFilter : {}),
        ...(phase_id ? { phase_id } : {}),
        ...(totem_id ? { totem_id } : {}),
      },
      include: {
        participant: true,
        totem: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, code: true, nombres: true, apellidos: true, email: true, telefono: true } },
        phase: { select: { id: true, name: true, number: true } },
        predictions: { include: { match: true } },
      },
      orderBy: { registered_at: 'desc' },
    });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Polla Mundial 2026';
    const ws = workbook.addWorksheet('Participantes');

    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    ws.columns = [
      { header: 'Origen',         key: 'origen',     width: 12 },
      { header: 'Factura',        key: 'factura',    width: 18 },
      { header: 'Código Empl.',   key: 'emp_code',   width: 15 },
      { header: 'Nombres',        key: 'nombres',    width: 20 },
      { header: 'Apellidos',      key: 'apellidos',  width: 20 },
      { header: 'Teléfono',       key: 'telefono',   width: 15 },
      { header: 'Email',          key: 'email',      width: 28 },
      { header: 'Tótem',          key: 'totem',      width: 16 },
      { header: 'Fase',           key: 'fase',       width: 22 },
      { header: 'Fecha registro', key: 'fecha',      width: 20 },
      { header: 'Predicción 1',   key: 'pred1',      width: 28 },
      { header: 'Predicción 2',   key: 'pred2',      width: 28 },
      { header: 'Predicción 3',   key: 'pred3',      width: 28 },
      { header: 'Aciertos',       key: 'aciertos',   width: 10 },
      { header: 'Ganador',        key: 'ganador',    width: 10 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.fill = headerFill; cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 24;

    registrations.forEach((reg, idx) => {
      const preds = reg.predictions || [];
      const fmt = (p: any) => p
        ? `${p.match?.team_local || '?'} ${p.goals_local}-${p.goals_visitor} ${p.match?.team_visitor || '?'}${p.is_correct ? ' ✓' : ''}`
        : '';
      const emp = reg.employee;
      const row = ws.addRow({
        origen: reg.source === 'WEB' ? 'Web' : 'Tótem',
        factura: reg.factura || '',
        emp_code: emp?.code || '',
        nombres: emp?.nombres || reg.participant?.nombres || '',
        apellidos: emp?.apellidos || reg.participant?.apellidos || '',
        telefono: emp?.telefono || reg.participant?.telefono || '',
        email: emp?.email || reg.participant?.email || '',
        totem: reg.totem?.name || '',
        fase: reg.phase?.name,
        fecha: reg.registered_at ? new Date(reg.registered_at).toLocaleString('es-EC') : '',
        pred1: fmt(preds[0]), pred2: fmt(preds[1]), pred3: fmt(preds[2]),
        aciertos: reg.correct_predictions,
        ganador: reg.is_winner ? '🏆 SÍ' : 'No',
      });
      if (idx % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }; });
      if (reg.is_winner) {
        row.getCell('ganador').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8EC' } };
        row.getCell('ganador').font = { bold: true, color: { argb: 'FFC8952A' } };
      }
    });

    ws.autoFilter = { from: 'A1', to: 'O1' };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
