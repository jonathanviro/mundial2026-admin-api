import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  findAll(campaign_id?: number, phase_id?: number, totem_id?: number) {
    return this.prisma.registration.findMany({
      where: {
        ...(campaign_id ? { totem: { campaign_id } } : {}),
        ...(phase_id ? { phase_id } : {}),
        ...(totem_id ? { totem_id } : {}),
      },
      include: {
        participant: true,
        totem: { select: { id: true, name: true, code: true } },
        phase: { select: { id: true, name: true, number: true } },
        predictions: { include: { match: true } },
      },
      orderBy: { registered_at: 'desc' },
    });
  }

  findWinners(campaign_id?: number, phase_id?: number) {
    return this.prisma.registration.findMany({
      where: {
        is_winner: true,
        ...(campaign_id ? { totem: { campaign_id } } : {}),
        ...(phase_id ? { phase_id } : {}),
      },
      include: {
        participant: true,
        totem: { select: { id: true, name: true, code: true } },
        phase: { select: { id: true, name: true } },
      },
      orderBy: { correct_predictions: 'desc' },
    });
  }

  async stats(campaign_id?: number) {
    const where = campaign_id ? { totem: { campaign_id } } : {};
    const [total, winners] = await Promise.all([
      this.prisma.registration.count({ where }),
      this.prisma.registration.count({ where: { ...where, is_winner: true } }),
    ]);
    return { total_registrations: total, total_winners: winners };
  }

  async exportExcel(campaign_id: number, phase_id?: number, totem_id?: number): Promise<Buffer> {
    const registrations = await this.findAll(campaign_id, phase_id, totem_id);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Polla Mundial 2026';
    const ws = workbook.addWorksheet('Participantes');

    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    ws.columns = [
      { header: 'Factura',        key: 'factura',    width: 18 },
      { header: 'Cédula',         key: 'cedula',     width: 15 },
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
      const row = ws.addRow({
        factura: reg.factura,
        cedula: reg.participant?.cedula,
        nombres: reg.participant?.nombres,
        apellidos: reg.participant?.apellidos,
        telefono: reg.participant?.telefono,
        email: reg.participant?.email,
        totem: reg.totem?.name,
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

    ws.autoFilter = { from: 'A1', to: 'N1' };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
