export type CustomerStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'OVERDUE'
  | 'STOP_CREDIT'
  | 'CLOSED';

export interface CustomerDetailsFormData {
  name: string;
  registeredName?: string;
  abn?: string;
  status: CustomerStatus;
  fmCustomerNumber?: string;
  orderRequired?: boolean;
}
