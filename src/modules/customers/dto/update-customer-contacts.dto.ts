export interface CustomerContactDto {
    id?: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    fax?: string
    role: 'GENERAL' | 'INVOICE' | 'STATEMENT'
    isPrimary?: boolean
    category?: "ACCOUNT" | "SHIPPING"
}

export interface UpdateCustomerContactsDto {
    contacts: CustomerContactDto[]
}
