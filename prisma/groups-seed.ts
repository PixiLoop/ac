import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Source data (mirrors GroupManagement static data) ─────────────────────────

const fixedMarginGroups = [
  { label: '1', a: 1.1,   k: 1.165  },
  { label: '2', a: 1.12,  k: 1.17   },
  { label: '3', a: 1.13,  k: 1.177  },
  { label: '4', a: 1.14,  k: 1.185  },
  { label: '5', a: 1.15,  k: 1.19   },
  { label: '6', a: 1.16,  k: 1.2    },
];

const salesPartnerGroups = [
  { label: '1', a: 1.2,   k: 1.28   },
  { label: '2', a: 1.22,  k: 1.29   },
  { label: '3', a: 1.24,  k: 1.3    },
  { label: '4', a: 1.25,  k: 1.333  },
  { label: '5', a: 1.263, k: 1.366  },
  { label: '6', a: 1.275, k: 1.4    },
];

const variableMarginTiers = [
  { landedLessThan: 10,   kRetail: 1.800, kTrade: 1.440, kThreshold: 0.800, aRetail: 1.600, aTrade: 1.280, aThreshold: 0.800 },
  { landedLessThan: 50,   kRetail: 1.700, kTrade: 1.403, kThreshold: 0.825, aRetail: 1.500, aTrade: 1.238, aThreshold: 0.825 },
  { landedLessThan: 100,  kRetail: 1.600, kTrade: 1.360, kThreshold: 0.850, aRetail: 1.450, aTrade: 1.233, aThreshold: 0.850 },
  { landedLessThan: 150,  kRetail: 1.500, kTrade: 1.305, kThreshold: 0.870, aRetail: 1.400, aTrade: 1.218, aThreshold: 0.870 },
  { landedLessThan: 250,  kRetail: 1.420, kTrade: 1.250, kThreshold: 0.880, aRetail: 1.370, aTrade: 1.206, aThreshold: 0.880 },
  { landedLessThan: 500,  kRetail: 1.380, kTrade: 1.242, kThreshold: 0.900, aRetail: 1.330, aTrade: 1.197, aThreshold: 0.900 },
  { landedLessThan: 750,  kRetail: 1.330, kTrade: 1.264, kThreshold: 0.950, aRetail: 1.290, aTrade: 1.226, aThreshold: 0.950 },
  { landedLessThan: 1000, kRetail: 1.280, kTrade: 1.280, kThreshold: 1.000, aRetail: 1.250, aTrade: 1.250, aThreshold: 1.000 },
  { landedLessThan: 1250, kRetail: 1.240, kTrade: 1.240, kThreshold: 1.000, aRetail: 1.220, aTrade: 1.220, aThreshold: 1.000 },
  { landedLessThan: 1600, kRetail: 1.200, kTrade: 1.200, kThreshold: 1.000, aRetail: 1.200, aTrade: 1.200, aThreshold: 1.000 },
];

const xGroups = [
  { code: 'X1', agent: 1.0,   partner: 1.2,   trade: 2.0,  retail: 2.0,  isManual: false },
  { code: 'X2', agent: 1.2,   partner: 1.333, trade: 2.0,  retail: 2.0,  isManual: false },
  { code: 'X3', agent: 1.333, partner: 1.5,   trade: 2.3,  retail: 2.5,  isManual: false },
  { code: 'X4', agent: 1.5,   partner: 1.8,   trade: 2.5,  retail: 3.0,  isManual: false },
  { code: 'X5', agent: 1.8,   partner: 2.0,   trade: 3.0,  retail: 3.5,  isManual: false },
  { code: 'X6', agent: 2.0,   partner: 2.25,  trade: 3.5,  retail: 4.0,  isManual: false },
  { code: 'X7', agent: 2.25,  partner: 2.5,   trade: 4.0,  retail: 4.5,  isManual: false },
  { code: 'X8', agent: 2.5,   partner: 2.62,  trade: 4.3,  retail: 4.7,  isManual: false },
  { code: 'X9', agent: 1.0,   partner: 1.0,   trade: 1.0,  retail: 1.0,  isManual: true  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding price groups…');

  // ── 1. InvAircoGroup: A1-A6 and K1-K6 ───────────────────────────────────
  for (const row of fixedMarginGroups) {
    const level = parseInt(row.label);
    const partnerA = salesPartnerGroups[level - 1].a;
    const partnerK = salesPartnerGroups[level - 1].k;

    // A group
    await (prisma as any).invAircoGroup.upsert({
      where: { code: `A${row.label}` },
      update: { agentFactor: row.a, partnerFactor: partnerA },
      create: {
        code: `A${row.label}`,
        groupLetter: 'A',
        level,
        agentFactor: row.a,
        partnerFactor: partnerA,
      },
    });

    // K group
    await (prisma as any).invAircoGroup.upsert({
      where: { code: `K${row.label}` },
      update: { agentFactor: row.k, partnerFactor: partnerK },
      create: {
        code: `K${row.label}`,
        groupLetter: 'K',
        level,
        agentFactor: row.k,
        partnerFactor: partnerK,
      },
    });
  }
  console.log('  ✓ InvAircoGroup: A1-A6, K1-K6');

  // ── 2. InvVariableMarginTier ─────────────────────────────────────────────
  // Clear existing tiers and re-insert to keep sortOrder clean
  await (prisma as any).invVariableMarginTier.deleteMany({});
  for (let i = 0; i < variableMarginTiers.length; i++) {
    const t = variableMarginTiers[i];
    await (prisma as any).invVariableMarginTier.create({
      data: {
        landedLessThan: t.landedLessThan,
        kRetailFactor:  t.kRetail,
        kTradeFactor:   t.kTrade,
        kThreshold:     t.kThreshold,
        aRetailFactor:  t.aRetail,
        aTradeFactor:   t.aTrade,
        aThreshold:     t.aThreshold,
        sortOrder:      i,
      },
    });
  }
  console.log('  ✓ InvVariableMarginTier: 10 tiers');

  // ── 3. InvXGroup: X1-X9 ─────────────────────────────────────────────────
  for (const x of xGroups) {
    await (prisma as any).invXGroup.upsert({
      where: { code: x.code },
      update: {
        agentFactor:   x.agent,
        partnerFactor: x.partner,
        tradeFactor:   x.trade,
        retailFactor:  x.retail,
        isManual:      x.isManual,
      },
      create: {
        code:          x.code,
        agentFactor:   x.agent,
        partnerFactor: x.partner,
        tradeFactor:   x.trade,
        retailFactor:  x.retail,
        isManual:      x.isManual,
      },
    });
  }
  console.log('  ✓ InvXGroup: X1-X9');

  // ── 4. InvPriceSettings: single default row ──────────────────────────────
  const existing = await (prisma as any).invPriceSettings.findFirst();
  if (!existing) {
    await (prisma as any).invPriceSettings.create({
      data: {
        roundBelow50:  20,
        roundBelow100: 50,
        roundAbove100: 100,
        priceOffset:   0,
        minSalesPrice: 100,
      },
    });
    console.log('  ✓ InvPriceSettings: defaults created');
  } else {
    console.log('  – InvPriceSettings: already exists, skipped');
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); throw e; })
  .finally(() => prisma.$disconnect());
