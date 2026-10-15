import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const airco    = (p: PrismaService) => (p as any).invAircoGroup;
const variable = (p: PrismaService) => (p as any).invVariableMarginTier;
const xgroup   = (p: PrismaService) => (p as any).invXGroup;
const settings = (p: PrismaService) => (p as any).invPriceSettings;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Airco (A/K) groups ────────────────────────────────────────────────────

  async getAircoGroups() {
    return airco(this.prisma).findMany({ orderBy: [{ groupLetter: 'asc' }, { level: 'asc' }] });
  }

  async updateAircoGroup(code: string, data: { agentFactor?: number; partnerFactor?: number }) {
    return airco(this.prisma).update({ where: { code }, data });
  }

  async bulkUpdateAircoGroups(rows: { code: string; agentFactor: number; partnerFactor: number }[]) {
    return this.prisma.$transaction(
      rows.map((r) =>
        airco(this.prisma).update({
          where: { code: r.code },
          data: { agentFactor: r.agentFactor, partnerFactor: r.partnerFactor },
        }),
      ),
    );
  }

  // ── Variable margin tiers ─────────────────────────────────────────────────

  async getVariableTiers() {
    return variable(this.prisma).findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async bulkUpdateVariableTiers(
    rows: {
      id: string;
      kRetailFactor: number; kTradeFactor: number; kThreshold: number;
      aRetailFactor: number; aTradeFactor: number; aThreshold: number;
    }[],
  ) {
    return this.prisma.$transaction(
      rows.map((r) =>
        variable(this.prisma).update({
          where: { id: r.id },
          data: {
            kRetailFactor: r.kRetailFactor, kTradeFactor: r.kTradeFactor, kThreshold: r.kThreshold,
            aRetailFactor: r.aRetailFactor, aTradeFactor: r.aTradeFactor, aThreshold: r.aThreshold,
          },
        }),
      ),
    );
  }

  // ── X groups ──────────────────────────────────────────────────────────────

  async getXGroups() {
    return xgroup(this.prisma).findMany({ orderBy: { code: 'asc' } });
  }

  async bulkUpdateXGroups(
    rows: { code: string; agentFactor: number; partnerFactor: number; tradeFactor: number; retailFactor: number }[],
  ) {
    return this.prisma.$transaction(
      rows.map((r) =>
        xgroup(this.prisma).update({
          where: { code: r.code },
          data: {
            agentFactor: r.agentFactor,
            partnerFactor: r.partnerFactor,
            tradeFactor: r.tradeFactor,
            retailFactor: r.retailFactor,
          },
        }),
      ),
    );
  }

  // ── Price settings ────────────────────────────────────────────────────────

  async getSettings() {
    return settings(this.prisma).findFirst();
  }

  async updateSettings(data: {
    roundBelow50?: number; roundBelow100?: number; roundAbove100?: number;
    priceOffset?: number; minSalesPrice?: number;
  }) {
    const existing = await settings(this.prisma).findFirst();
    if (existing) {
      return settings(this.prisma).update({ where: { id: existing.id }, data });
    }
    return settings(this.prisma).create({ data });
  }
}
