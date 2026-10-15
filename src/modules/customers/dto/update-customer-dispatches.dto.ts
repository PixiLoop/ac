export class CustomerDispatchDto {
  id?: string
  method: string
  accountNo?: string
  accountName?: string
  charge?: number
  reference?: string
  isDefault?: boolean
}

export class UpdateCustomerDispatchesDto {
  dispatches: CustomerDispatchDto[]
}

export class CustomerDepotsDto {
  id?: string
  code: string
  name: string
}

export class UpdateCustomerDepotsDto {
  depots: CustomerDepotsDto[]
}
