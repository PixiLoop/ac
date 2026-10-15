'use client';

import { CustomerDispatchesTable } from '../tables/CustomerDispatchesTable';

export function CustomerDispatchesSection({
  customerId,
}: {
  customerId: string;
}) {
  return <CustomerDispatchesTable customerId={customerId} />;
}
