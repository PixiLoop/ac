export const ACCOUNT_CLOSED_MESSAGE = 'This Account has been Closed';
export const ACCOUNT_STOP_SUPPLY_MESSAGE = 'STOP SUPPLY SET FOR CUSTOMER';
export const ACCOUNT_OVERDUE_MESSAGE = 'Authorisation Required';

export type AccountContext = 'sales-order' | 'invoice';
export type AccountGate = 'allow' | 'block' | 'warn';

export function accountStatusGate(
  status: string | null | undefined,
  context: AccountContext,
): { gate: AccountGate; message: string } {
  const value = (status || 'ACTIVE').toUpperCase();

  if (value === 'CLOSED' || value === 'INACTIVE') {
    return { gate: 'block', message: ACCOUNT_CLOSED_MESSAGE };
  }

  if (value === 'STOP_CREDIT') {
    if (context === 'invoice') {
      return { gate: 'block', message: ACCOUNT_STOP_SUPPLY_MESSAGE };
    }
    return { gate: 'warn', message: ACCOUNT_STOP_SUPPLY_MESSAGE };
  }

  if (value === 'OVERDUE') {
    return { gate: 'warn', message: ACCOUNT_OVERDUE_MESSAGE };
  }

  return { gate: 'allow', message: '' };
}
