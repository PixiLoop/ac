'use client';

import { CustomerAccountForm } from '../forms/CustomerAccountForm';

export function CustomerAccountSection({
  customerId,
}: {
  customerId: string;
}) {
  return <CustomerAccountForm customerId={customerId} />;
}
