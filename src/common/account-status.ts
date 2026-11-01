import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const ACCOUNT_CLOSED_MESSAGE = 'This Account has been Closed';
export const ACCOUNT_STOP_SUPPLY_MESSAGE = 'STOP SUPPLY SET FOR CUSTOMER';

export async function assertAccountStatus(
  prisma: PrismaService,
  customerId: string | null | undefined,
  context: 'sales-order' | 'invoice',
) {
  if (!customerId) return;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { status: true },
  });
  if (!customer) return;

  if (customer.status === 'CLOSED' || customer.status === 'INACTIVE') {
    throw new BadRequestException(ACCOUNT_CLOSED_MESSAGE);
  }

  if (context === 'invoice' && customer.status === 'STOP_CREDIT') {
    throw new BadRequestException(ACCOUNT_STOP_SUPPLY_MESSAGE);
  }
}
