export class CustomerRules {
    static validateCreate(dto: any) {
        if (!dto.name?.trim()) {
            throw new Error('Customer name is required')
        }
    }

    static validateCreditLimit(
        creditLimit?: number,
        currentBalance?: number
    ) {
        if (
            creditLimit !== undefined &&
            currentBalance !== undefined &&
            creditLimit < currentBalance
        ) {
            throw new Error(
                'Credit limit cannot be lower than current balance'
            )
        }
    }

    static validateContacts(contacts: any[]) {
        if (!contacts || contacts.length === 0) {
            throw new Error('At least one contact is required')
        }

        const activeContacts = contacts.filter(c => !c.deletedAt)
        if (activeContacts.length === 0) {
            throw new Error('At least one active contact must exist')
        }

        const primaryContacts = contacts.filter(c => c.isPrimary)
        if (primaryContacts.length !== 1) {
            throw new Error('Exactly one primary contact is required')
        }
    }

    static validateAddresses(addresses: any[]) {
        if (!addresses || addresses.length === 0) {
            throw new Error('At least one address is required')
        }
    }

    static validateAccountUpdate(
        creditLimit?: number,
        creditHold?: boolean,
        creditHoldReason?: string,
        currentBalance?: number,
    ) {
        if (
            creditLimit !== undefined &&
            currentBalance !== undefined &&
            creditLimit < currentBalance
        ) {
            throw new Error('Credit limit cannot be lower than current balance')
        }

        if (creditHold && !creditHoldReason) {
            throw new Error('Credit hold reason is required')
        }
    }

    static validatePaymentUpdate(
        paymentTerms?: string,
        priceLevel?: string,
        gstExempt?: boolean,
    ) {
        // intentionally empty for now
    }


}
