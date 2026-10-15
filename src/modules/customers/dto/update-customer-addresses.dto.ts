export interface CustomerAddressDto {
  id?: string
  type: 'SHIPPING' | 'POSTAL' | 'STATEMENT' | 'CHARGE'
  name?: string
  address1: string
  address2?: string
  address3?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  isDefault?: boolean
}

export interface UpdateCustomerAddressesDto {
  addresses: CustomerAddressDto[]
}
