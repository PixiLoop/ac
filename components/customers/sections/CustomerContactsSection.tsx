'use client';

import { CustomerContactsTable } from '../tables/CustomerContactsTable';

export function CustomerContactsSection({
  customerId,
}: {
  customerId: string;
}) {
  return <CustomerContactsTable customerId={customerId} />;
}
