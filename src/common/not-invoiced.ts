export interface NotInvoicedResult {
  byLine: Map<string, number>;
  byProduct: Map<string, number>;
}

export async function notInvoicedBySalesOrderLine(
  prisma: any,
  salesOrderId: string
): Promise<NotInvoicedResult> {
  const byLine = new Map<string, number>();
  const byProduct = new Map<string, number>();

  if (!salesOrderId) return { byLine, byProduct };

  try {
    const soItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId, deletedAt: null },
      select: { id: true, productId: true, quantity: true },
    });

    const invoices = await prisma.invoice.findMany({
      where: { salesOrderId, deletedAt: null, status: { not: 'CANCELLED' } },
      select: {
        items: {
          where: { deletedAt: null },
          select: { productId: true, quantity: true },
        },
      },
    });

    const invoicedByProduct = new Map<string, number>();
    for (const inv of invoices) {
      for (const item of inv.items) {
        const cur = invoicedByProduct.get(item.productId) ?? 0;
        invoicedByProduct.set(item.productId, cur + Number(item.quantity || 0));
      }
    }

    for (const item of soItems) {
      const soQty = Number(item.quantity || 0);
      const invQty = invoicedByProduct.get(item.productId) ?? 0;
      const remaining = Math.max(0, soQty - invQty);

      byLine.set(item.id, remaining);
      const prodRem = byProduct.get(item.productId) ?? 0;
      byProduct.set(item.productId, prodRem + remaining);
    }
  } catch (e) {}

  return { byLine, byProduct };
}
