export interface CreateCustomerDto {
  name: string
  registeredName?: string
  abn?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'STOP_CREDIT' | 'CLOSED'
  fmCustomerNumber?: string
  orderRequired?: boolean
  customerNumber?: string
  isGeneric?: boolean
  requiresShippingDetails?: boolean
}
