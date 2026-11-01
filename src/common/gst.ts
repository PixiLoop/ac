export async function resolveGstRate(
  prisma: any,
  customerId?: string | null
): Promise<number> {
  if (!customerId) return 0.10;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { gstExempt: true },
    });
    if (customer?.gstExempt) return 0;
  } catch (e) {}
  return 0.10;
}
