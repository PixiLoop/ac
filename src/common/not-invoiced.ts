import { PrismaService } from '../prisma/prisma.service';

/** Quantity on each sales-order line that is not yet on a non-cancelled invoice. */
export async function notInvoicedBySalesOrderLine(prisma: PrismaService, salesOrderId: string) {
  const so = await prisma.salesOrder.findFirst({
    where: { id: salesOrderId, deletedAt: null },
    include: {
      items: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  });
  const byLine = new Map<string, number>();
  const byProduct = new Map<string, number>();
  if (!so) return { byLine, byProduct };

  const invoices = await prisma.invoice.findMany({
    where: { salesOrderId, deletedAt: null, status: { not: 'CANCELLED' } },
    include: { items: { where: { deletedAt: null } } },
  });
  const invoiced = new Map<string, number>();
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      invoiced.set(item.productId, (invoiced.get(item.productId) ?? 0) + Number(item.quantity));
    }
  }

  const left = new Map(invoiced);
  for (const line of so.items) {
    const qty = Number(line.quantity);
    const used = Math.min(qty, left.get(line.productId) ?? 0);
    left.set(line.productId, (left.get(line.productId) ?? 0) - used);
    byLine.set(line.id, qty - used);
  }
  for (const line of so.items) {
    const total = (byProduct.get(line.productId) ?? 0) + Number(line.quantity);
    byProduct.set(line.productId, total);
  }
  for (const [productId, qty] of Array.from(byProduct)) {
    byProduct.set(productId, Math.max(0, qty - (invoiced.get(productId) ?? 0)));
  }
  return { byLine, byProduct };
}
