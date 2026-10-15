'use client';

import { CustomerPaymentForm } from '../forms/CustomerPaymentForm';

export function CustomerPaymentSection({
  customerId,
}: {
  customerId: string;
}) {
  return <CustomerPaymentForm customerId={customerId} />;
}
