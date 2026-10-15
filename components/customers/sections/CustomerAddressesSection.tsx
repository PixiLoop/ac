'use client';

import { CustomerAddressesTable } from '../tables/CustomerAddressesTable';

export function CustomerAddressesSection({
  customerId,
}: {
  customerId: string;
}) {
  return <CustomerAddressesTable customerId={customerId} />;
}
