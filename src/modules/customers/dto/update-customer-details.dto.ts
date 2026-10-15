export interface UpdateCustomerDetailsDto {
  name?: string
  registeredName?: string
  abn?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'STOP_CREDIT' | 'CLOSED'
  fmCustomerNumber?: string
  orderRequired?: boolean
  isGeneric?: boolean
  requiresShippingDetails?: boolean
}
