'use client'

import { useEffect, useState } from 'react'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { FormSection } from '../../../components/forms/FormSection'
import { api } from '../../../lib/api-client'
import { fetchDispatchMethodOptions } from '../../customers/forms/CustomerDispatchForm'

const PRICE_LEVEL_OPTIONS = [
    { label: 'Retail', value: 'RETAIL' },
    { label: 'Trade', value: 'TRADE' },
    { label: 'Sales Partner', value: 'SALES_PARTNER' },
    { label: 'Agent', value: 'AGENT' },
]

const PAYMENT_TERMS = [
    { label: '14 Days', value: 'DAYS_14' },
    { label: '30 Days', value: 'DAYS_30' },
    { label: '60 Days', value: 'DAYS_60' },
    { label: '90 Days', value: 'DAYS_90' },
    { label: 'COD', value: 'COD' },
    { label: 'PAY NOW', value: 'PAY_NOW' },
]

const STATUS_OPTIONS = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Sent', value: 'SENT' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' }
]

export function QuotationDetailsSection({ value, update, readOnly = false, setFreight }: any) {
    const [dispatchMethods, setDispatchMethods] = useState<any[]>([]);
    const [dispatchMethodOptions, setDispatchMethodOptions] = useState<{ label: string; value: string }[]>([]);
    const [dispatches, setDispatches] = useState<any[]>([]);

    useEffect(() => {
        fetchDispatchMethodOptions().then(setDispatchMethodOptions);
    }, []);
    // useEffect(() => {
    //     api
    //         .get('/dispatch-methods')
    //         .then(res => {
    //             const list = res.data?.data ?? res.data ?? [];
    //             setDispatchMethods(list);
    //         })
    //         .catch(err => {
    //             console.error('Failed to load dispatch methods', err);
    //         });
    // }, []);

    const [customerOptions, setCustomerOptions] = useState([])

    useEffect(() => {
        api.get('/customers', { params: { take: 100 } })
            .then(res => {
                const list = res.data?.data ?? []
                setCustomerOptions(
                    list.map((c: any) => ({
                        label: `${c.customerNumber} — ${c.name}`,
                        value: c.id
                    }))
                )
            })
    }, [])


    useEffect(() => {
        if (!value.customerId) {
            setDispatches([]);
            return;
        }
        api.get(`/customers/${value.customerId}`)
            .then(res => {
                const customer = res.data?.data ?? res.data;
                const list = customer?.dispatches ?? [];
                setDispatches(list);

                if (!value.dispatchId) {
                    const def = list.find((d: any) => d.isDefault);
                    if (def) update('dispatchId', def.id);
                }

                if (!value.abnNumber && customer?.abn) {
                    update('abnNumber', customer.abn);
                }
            })
            .catch(() => setDispatches([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.customerId]);

    const methodLabel = (code: string) =>
        dispatchMethodOptions.find(o => o.value === code)?.label ?? code;

    const handleCustomerChange = async (customerId: string) => {

        update('customerId', customerId)

        /* CLEAR OLD SHIPPING */
        update('name', '')
        update('address1', '')
        update('address2', '')
        update('city', '')
        update('state', '')
        update('postcode', '')

        /* CLEAR OLD ACCOUNT */
        update('accountName', '')
        update('accountAddress1', '')
        update('accountAddress2', '')
        update('accountCity', '')
        update('accountState', '')
        update('accountPostcode', '')

        /* CLEAR CUSTOMER FIELDS */
        // update('priceLevel', '')
        // update('paymentTerms', '')
        // update('salesFactor', '')

        const res = await api.get(`/customers/${customerId}`)
        const customer = res.data?.data ?? res.data

        console.log('Customer data:', {
            priceLevel: customer.priceLevel,
            paymentTerms: customer.paymentTerms,
            salesFactor: customer.salesFactor,
        })

        if (!customer) return

        //Populate Price Level, Payment Terms, Sales Factor from customer master
        if (customer.priceLevel) update('priceLevel', customer.priceLevel)
        if (customer.paymentTerms) update('paymentTerms', customer.paymentTerms)
        if (customer.salesFactor != null) update('salesFactor', Number(customer.salesFactor));
        update('gstExempt', customer.gstExempt || false)

        const shipping = customer.addresses?.find(
            (a: any) => a.type === 'SHIPPING'
        )

        const postal = customer.addresses?.find(
            (a: any) => a.type === 'CHARGE'
        )

        if (shipping) {
            update('name', customer.name)
            update('address1', shipping.address1)
            update('address2', shipping.address2 || '')
            update('city', shipping.city)
            update('state', shipping.state)
            update('postcode', shipping.postcode)
        }

        if (postal) {
            update('accountName', customer.name)
            update('accountAddress1', postal.address1)
            update('accountAddress2', postal.address2 || '')
            update('accountCity', postal.city)
            update('accountState', postal.state)
            update('accountPostcode', postal.postcode)
        }
    }

    useEffect(() => {
        if (value.customerId && value.dispatchMethod) {
            const dispatch = dispatches.find(item => item.method === value.dispatchMethod)
            const freight = Number(dispatch?.charge || 0)
            setFreight(freight)
        } else {
            if (setFreight) {
                setFreight(0)
            }
        }
    }, [value.customerId, value.dispatchMethod, dispatches])


    return (
        <FormSection title="Quotation Details" required defaultOpen>

            <div className="grid grid-cols-3 gap-4">
                <Input
                    label="Quote Number"
                    value={value.quoteNumber || ''}
                    placeholder="System Generated"
                    readOnly
                />

                <SearchSelect
                    value={value.customerId}
                    onChange={(v) => handleCustomerChange(v)}
                    options={customerOptions}
                    placeholder="Select customer"
                    disabled={readOnly}
                />

                <Input
                    label="Request Number"
                    value={value.requestNumber || ''}
                    onChange={e => update('requestNumber', e.target.value)}
                    disabled={readOnly}
                />

                <Input
                    label="Quotation Date"
                    type="date"
                    value={value.quotationDate || ''}
                    onChange={e => update('quotationDate', e.target.value)}
                    disabled={readOnly}
                />

                <Input
                    label="Expiry Date"
                    type="date"
                    value={value.expiryDate || ''}
                    onChange={e => update('expiryDate', e.target.value)}
                    disabled={readOnly}
                />

                <Select
                    label="Price Level"
                    value={value.priceLevel}
                    options={PRICE_LEVEL_OPTIONS}
                    onChange={v => update('priceLevel', v)}
                    disabled={readOnly}
                />

                <Select
                    label="Dispatch Method"
                    value={value.dispatchMethod}
                    options={dispatches.map((d: any) => ({
                        label: `${methodLabel(d.method)}${d.accountName ? ' — ' + d.accountName : d.accountNo ? ' — ' + d.accountNo : ''}`,
                        value: d.method,
                    }))}
                    placeholder="Select Method..."
                    onChange={v => update('dispatchMethod', v)}
                    disabled={readOnly}
                />


                <Input
                    label="Sales Factor"
                    value={value.salesFactor || ''}
                    onChange={e => update('salesFactor', Number(e.target.value))}
                    disabled={true}
                />

                <Select
                    label="Payment Terms"
                    value={value.paymentTerms}
                    options={PAYMENT_TERMS}
                    onChange={v => update('paymentTerms', v)}
                    disabled={true}
                />

                <Select
                    label="Status"
                    value={value.status || 'DRAFT'}
                    options={STATUS_OPTIONS}
                    onChange={v => update('status', v)}
                    disabled={readOnly}
                />

            </div>

        </FormSection>
    )
}