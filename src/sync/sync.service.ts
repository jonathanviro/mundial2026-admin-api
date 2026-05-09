import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  private async verifyTotem(totem_code: string) {
    const totem = await this.prisma.totem.findUnique({ where: { code: totem_code } });
    if (!totem || !totem.active) throw new UnauthorizedException('Tótem no registrado o inactivo');
    return totem;
  }

  async heartbeat(totem_code: string, version_data: number) {
    const totem = await this.verifyTotem(totem_code);
    await this.prisma.totem.update({
      where: { id: totem.id },
      data: { last_heartbeat: new Date(), version_data },
    });
    const phase = await this.prisma.phase.findFirst({
      where: { campaign_id: totem.campaign_id, active: true, published: true },
      orderBy: { version: 'desc' },
    });
    return {
      status: 'ok',
      server_version: phase?.version || 0,
      has_update: phase ? version_data < phase.version : false,
    };
  }

  async getData(totem_code: string, client_version: number, client_phase_id?: number) {
    const totem = await this.verifyTotem(totem_code);
    const phase = await this.prisma.phase.findFirst({
      where: { campaign_id: totem.campaign_id, active: true, published: true },
      orderBy: { version: 'desc' },
    });
    if (!phase) return { has_update: false, server_version: 0, phase: null, matches: [], campaign: null };
    
    // Check for update: version OR phase_id changed
    const hasUpdate = client_version < phase.version || client_phase_id !== phase.id;
    if (!hasUpdate) return { has_update: false, server_version: phase.version, server_phase_id: phase.id };
    
    const [matches, campaign] = await Promise.all([
      this.prisma.match.findMany({ where: { phase_id: phase.id }, orderBy: { match_number: 'asc' } }),
      this.prisma.campaign.findUnique({ where: { id: totem.campaign_id } }),
    ]);
    
    await this.prisma.totem.update({
      where: { id: totem.id },
      data: { last_sync: new Date(), last_heartbeat: new Date(), version_data: phase.version },
    });
    
    return {
      has_update: true,
      server_version: phase.version,
      server_phase_id: phase.id,
      campaign: { id: campaign.id, name: campaign.name, slug: campaign.slug, bg_screen1_url: campaign.bg_screen1_url, bg_screen2_url: campaign.bg_screen2_url },
      phase: { id: phase.id, number: phase.number, name: phase.name, date_from: phase.date_from, date_to: phase.date_to, predictions_required: phase.predictions_required, min_correct_to_win: phase.min_correct_to_win, version: phase.version },
      matches,
    };
  }

  async pushRegistrations(totem_code: string, items: any[]) {
    const totem = await this.verifyTotem(totem_code);
    const phase = await this.prisma.phase.findFirst({
      where: { campaign_id: totem.campaign_id, active: true, published: true },
    });
    if (!phase) return { results: items.map(i => ({ local_id: i.local_id, status: 'no_phase' })) };

    const results = [];
    for (const item of items) {
      try {
        const existingFact = await this.prisma.registration.findUnique({ where: { factura: item.factura } });
        if (existingFact) {
          if (item.champion_team && item.champion_team !== existingFact.champion_team) {
            await this.prisma.registration.update({
              where: { factura: item.factura },
              data: { champion_team: item.champion_team },
            });
          }
          results.push({ local_id: item.local_id, factura: item.factura, status: 'duplicate_factura' });
          continue;
        }

        const existingLocal = item.local_id
          ? await this.prisma.registration.findUnique({ where: { local_id: item.local_id } })
          : null;
        if (existingLocal) { results.push({ local_id: item.local_id, factura: item.factura, status: 'already_synced' }); continue; }

        let participant = await this.prisma.participant.findUnique({ where: { campaign_id_cedula: { campaign_id: totem.campaign_id, cedula: item.cedula } } });
        if (!participant) {
          participant = await this.prisma.participant.create({ data: { campaign_id: totem.campaign_id, cedula: item.cedula, nombres: item.nombres, apellidos: item.apellidos, telefono: item.telefono, email: item.email } });
        }

        const registration = await this.prisma.registration.create({
          data: {
            factura: item.factura,
            participant_id: participant.id,
            totem_id: totem.id,
            phase_id: phase.id,
            local_id: item.local_id || null,
            champion_team: item.champion_team || null,
            registered_at: item.registered_at ? new Date(item.registered_at) : new Date(),
            synced_at: new Date(),
            predictions: {
              create: (item.predictions || []).map((p: any) => ({
                match_id: p.match_id,
                goals_local: p.goals_local,
                goals_visitor: p.goals_visitor,
              })),
            },
          },
        });
        results.push({ local_id: item.local_id, factura: item.factura, status: 'ok' });
      } catch (err: any) {
        results.push({ local_id: item.local_id, factura: item.factura, status: 'error', message: err.message });
      }
    }
    return { results };
  }

  async checkFactura(totem_code: string, factura: string) {
    await this.verifyTotem(totem_code);
    const existing = await this.prisma.registration.findUnique({ where: { factura } });
    return { available: !existing };
  }
}
