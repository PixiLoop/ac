import { BadRequestException } from '@nestjs/common';

export async function assertAccountStatus(
  prisma: any,
  customerId?: string | null,
  action = 'action'
): Promise<void> {
  if (!customerId) return;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, creditHold: true, creditHoldReason: true, status: true },
    });
    if (!customer) return;
    if (customer.creditHold) {
      throw new BadRequestException(
        `Cannot perform ${action}: Customer ${customer.name} is on credit hold.${customer.creditHoldReason ? ` Reason: ${customer.creditHoldReason}` : ''}`
      );
    }
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
  }
}
