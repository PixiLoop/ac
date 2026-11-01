import { PrismaService } from '../prisma/prisma.service';

export async function resolveGstRate(prisma: PrismaService, customerId?: string | null) {
  let percent = 10;
  try {
    const rows = await prisma.$queryRaw<Array<{ gstFactor: unknown }>>`
      SELECT "gstFactor" FROM "inventory"."InvPriceSettings" LIMIT 1
    `;
    const parsed = Number(rows?.[0]?.gstFactor);
    if (Number.isFinite(parsed)) percent = parsed;
  } catch {
    percent = 10;
  }
  const rate = percent / 100;
  if (!customerId) return rate;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { gstExempt: true },
  });
  return customer?.gstExempt ? 0 : rate;
}
