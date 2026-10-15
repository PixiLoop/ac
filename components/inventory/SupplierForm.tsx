'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../ui/toast';
import { Card, CardHeader, CardTitle, CardContent } from './shared-ui';
import type { Supplier } from './types';

const EXPENSE_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: '1', label: '1 > Stock' },
  { code: '10', label: '10 > GST Paid on Purchases' },
  { code: '100', label: '100 > Bank Charges' },
  { code: '101', label: '101 > Bank Account Service Fees' },
  { code: '102', label: '102 > Bank Special Fees' },
  { code: '103', label: '103 > Credit Card Fees' },
  { code: '104', label: '104 > Interest Paid' },
  { code: '105', label: '105 > Other' },
];


const ORDER_METHOD_MAP: Record<NonNullable<Supplier['orderMethod']>, string> = {
  Post: 'POST', Fax: 'FAX', Email: 'EMAIL',
};
const DISPATCH_METHOD_MAP: Record<NonNullable<Supplier['dispatchMethod']>, string> = {
  'Supplier Carrier': 'SUPPLIER_CARRIER',
  'Supplier Air Bag': 'SUPPLIER_AIR_BAG',
  'Airco Carrier': 'AIRCO_CARRIER',
};
const ORDER_METHOD_FROM_API: Record<string, NonNullable<Supplier['orderMethod']>> = {
  POST: 'Post', FAX: 'Fax', EMAIL: 'Email',
};
const DISPATCH_METHOD_FROM_API: Record<string, NonNullable<Supplier['dispatchMethod']>> = {
  SUPPLIER_CARRIER: 'Supplier Carrier',
  SUPPLIER_AIR_BAG: 'Supplier Air Bag',
  AIRCO_CARRIER: 'Airco Carrier',
};

type Props = { supplierId?: string };

export function SupplierForm({ supplierId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [saving, setSaving] = React.useState(false);

  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [abn, setAbn] = React.useState('');

  const [activeSupplierForAai, setActiveSupplierForAai] = React.useState(false);
  const [expenseTypeCode, setExpenseTypeCode] = React.useState('1');
  const [expenseTypeKey, setExpenseTypeKey] = React.useState('1');

  const [deliveryAddress1, setDeliveryAddress1] = React.useState('');
  const [deliveryAddress2, setDeliveryAddress2] = React.useState('');
  const [deliveryAddress3, setDeliveryAddress3] = React.useState('');
  const [postalAddress1, setPostalAddress1] = React.useState('');
  const [postalAddress2, setPostalAddress2] = React.useState('');
  const [postalAddress3, setPostalAddress3] = React.useState('');
  const [asAbove, setAsAbove] = React.useState(false);

  const [serviceRep, setServiceRep] = React.useState('');
  const [orderPhone, setOrderPhone] = React.useState('');
  const [fax, setFax] = React.useState('');
  const [orderEmail, setOrderEmail] = React.useState('');
  const [ordersClose, setOrdersClose] = React.useState('00:00');
  const [minOrderValue, setMinOrderValue] = React.useState('0.00');
  const [freightCost, setFreightCost] = React.useState('0.00');
  const [freightCutsAt, setFreightCutsAt] = React.useState('0.00');
  const [airBagClose, setAirBagClose] = React.useState('00:00');
  const [airBagCost, setAirBagCost] = React.useState('0.00');
  const [orderLandedFactor, setOrderLandedFactor] = React.useState('1065');
  const [orderMethod, setOrderMethod] = React.useState<NonNullable<Supplier['orderMethod']>>('Email');
  const [dispatchMethod, setDispatchMethod] = React.useState<NonNullable<Supplier['dispatchMethod']>>('Supplier Carrier');
  const [useSupplierPartNumber, setUseSupplierPartNumber] = React.useState(false);

  // Representative
  const [repContactName, setRepContactName] = React.useState('');
  const [repContactPhone, setRepContactPhone] = React.useState('');
  const [repContactMobile, setRepContactMobile] = React.useState('');
  const [repContactEmail, setRepContactEmail] = React.useState('');
  // Accounts Dept
  const [accContactName, setAccContactName] = React.useState('');
  const [accContactPhone, setAccContactPhone] = React.useState('');
  const [accContactFax, setAccContactFax] = React.useState('');
  const [accContactEmail, setAccContactEmail] = React.useState('');
  // Warranty Dept
  const [warContactName, setWarContactName] = React.useState('');
  const [warContactPhone, setWarContactPhone] = React.useState('');
  const [warContactFax, setWarContactFax] = React.useState('');
  const [warContactEmail, setWarContactEmail] = React.useState('');

  // Account Status
  const [creditLimit, setCreditLimit] = React.useState('0.00');
  const [tradingTerms, setTradingTerms] = React.useState('30 Days');
  const [paymentMethod, setPaymentMethod] = React.useState('Cash');
  const [billerCodeBsb, setBillerCodeBsb] = React.useState('');
  const [accountReference, setAccountReference] = React.useState('');

  const [poAttachmentType, setPoAttachmentType] = React.useState<'PDF' | 'EXCEL' | 'BOTH'>('PDF');

  React.useEffect(() => {
    if (!supplierId) return;
    api.get(`/inventory/suppliers/${supplierId}`).then((res) => {
      const d = res.data?.data ?? res.data;
      setCode(d.code ?? '');
      setName(d.name ?? '');
      setAbn(d.abn ?? '');
      setActiveSupplierForAai(d.activeSupplierForAai ?? false);
      setExpenseTypeCode(d.expenseTypeCode ?? '1');
      setExpenseTypeKey(d.expenseTypeKey ?? d.expenseTypeCode ?? '1');
      setDeliveryAddress1(d.deliveryAddress1 ?? '');
      setDeliveryAddress2(d.deliveryAddress2 ?? '');
      setDeliveryAddress3(d.deliveryAddress3 ?? '');
      setPostalAddress1(d.postalAddress1 ?? '');
      setPostalAddress2(d.postalAddress2 ?? '');
      setPostalAddress3(d.postalAddress3 ?? '');
      setServiceRep(d.serviceRep ?? '');
      setOrderPhone(d.orderPhone ?? '');
      setFax(d.fax ?? '');
      setOrderEmail(d.orderEmail ?? '');
      setOrdersClose(d.ordersClose ?? '00:00');
      setMinOrderValue(d.minOrderValue?.toString() ?? '0.00');
      setFreightCost(d.freightCost?.toString() ?? '0.00');
      setFreightCutsAt(d.freightCutsAt?.toString() ?? '0.00');
      setAirBagClose(d.airBagClose ?? '00:00');
      setAirBagCost(d.airBagCost?.toString() ?? '0.00');
      setOrderLandedFactor(d.orderLandedFactor?.toString() ?? '1065');
      setOrderMethod(ORDER_METHOD_FROM_API[d.orderMethod] ?? 'Email');
      setDispatchMethod(DISPATCH_METHOD_FROM_API[d.dispatchMethod] ?? 'Supplier Carrier');
      setUseSupplierPartNumber(d.useSupplierPartNumber ?? false);
      setRepContactName(d.repContactName ?? '');
      setRepContactPhone(d.repContactPhone ?? '');
      setRepContactMobile(d.repContactMobile ?? '');
      setRepContactEmail(d.repContactEmail ?? '');
      setAccContactName(d.accContactName ?? '');
      setAccContactPhone(d.accContactPhone ?? '');
      setAccContactFax(d.accContactFax ?? '');
      setAccContactEmail(d.accContactEmail ?? '');
      setWarContactName(d.warContactName ?? '');
      setWarContactPhone(d.warContactPhone ?? '');
      setWarContactFax(d.warContactFax ?? '');
      setWarContactEmail(d.warContactEmail ?? '');
      setCreditLimit(d.creditLimit?.toString() ?? '0.00');
      setTradingTerms(d.tradingTerms ?? '30 Days');
      setPaymentMethod(d.paymentMethod ?? 'Cash');
      setBillerCodeBsb(d.billerCodeBsb ?? '');
      setAccountReference(d.accountReference ?? '');
      setPoAttachmentType(d.poAttachmentType ?? 'PDF');
    }).catch(() => {
      showToast({ type: 'error', title: 'Failed to load supplier' });
    });
  }, [supplierId]);

  React.useEffect(() => {
    if (asAbove) {
      setPostalAddress1(deliveryAddress1);
      setPostalAddress2(deliveryAddress2);
      setPostalAddress3(deliveryAddress3);
    }
  }, [asAbove, deliveryAddress1, deliveryAddress2, deliveryAddress3]);

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      showToast({ type: 'error', title: 'Supplier Code and Name are required' });
      return;
    }
    setSaving(true);
    const payload = {
      code,
      name,
      ...(abn && { abn }),
      deliveryAddress1, deliveryAddress2, deliveryAddress3,
      postalAddress1, postalAddress2, postalAddress3,
      serviceRep, fax, orderPhone, orderEmail, ordersClose,
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
      freightCost: freightCost ? parseFloat(freightCost) : undefined,
      freightCutsAt: freightCutsAt ? parseFloat(freightCutsAt) : undefined,
      airBagClose,
      airBagCost: airBagCost ? parseFloat(airBagCost) : undefined,
      orderLandedFactor: orderLandedFactor ? parseFloat(orderLandedFactor) : undefined,
      orderMethod: ORDER_METHOD_MAP[orderMethod],
      dispatchMethod: DISPATCH_METHOD_MAP[dispatchMethod],
      useSupplierPartNumber, activeSupplierForAai, expenseTypeCode, expenseTypeKey,
      repContactName, repContactPhone, repContactMobile, repContactEmail,
      accContactName, accContactPhone, accContactFax, accContactEmail,
      warContactName, warContactPhone, warContactFax, warContactEmail,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      tradingTerms, paymentMethod, billerCodeBsb, accountReference,
      poAttachmentType
    };
    try {
      if (supplierId) {
        await api.patch(`/inventory/suppliers/${supplierId}`, payload);
      } else {
        await api.post('/inventory/suppliers', payload);
      }
      showToast({ type: 'success', title: 'Supplier saved successfully' });
      router.push('/inventory/suppliers');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to save supplier';
      showToast({ type: 'error', title: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{supplierId ? 'Edit Supplier' : 'Add Supplier'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage supplier details, contact information, and payment terms.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Supplier'}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-[11px]">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Supplier Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Supplier Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>A.B.N</Label>
            <Input type='number' value={abn} onChange={(e) => setAbn(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Delivery Address1</Label>
              <Input
                value={deliveryAddress1}
                onChange={(e) => setDeliveryAddress1(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Address2</Label>
              <Input
                value={deliveryAddress2}
                onChange={(e) => setDeliveryAddress2(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Address3</Label>
              <Input
                value={deliveryAddress3}
                onChange={(e) => setDeliveryAddress3(e.target.value)}
              />
            </div>
          </div>
          <Checkbox label="As Above" checked={asAbove} onChange={setAsAbove} />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Postal Address1</Label>
              <Input
                value={postalAddress1}
                onChange={(e) => setPostalAddress1(e.target.value)}
                disabled={asAbove}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Address2</Label>
              <Input
                value={postalAddress2}
                onChange={(e) => setPostalAddress2(e.target.value)}
                disabled={asAbove}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Address3</Label>
              <Input
                value={postalAddress3}
                onChange={(e) => setPostalAddress3(e.target.value)}
                disabled={asAbove}
              />
            </div>
          </div>
        </div>

        <div className="rounded border border-slate-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
          <div className="grid gap-6 md:grid-cols-3">

            {/* Representative */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold border px-2 py-0.5 rounded inline-block">Representative</h4>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={repContactName} onChange={(e) => setRepContactName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={repContactPhone} onChange={(e) => setRepContactPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Mobile</Label>
                <Input value={repContactMobile} onChange={(e) => setRepContactMobile(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact E-mail</Label>
                <Input value={repContactEmail} onChange={(e) => setRepContactEmail(e.target.value)} />
              </div>
            </div>

            {/* Accounts Dept */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold  border  px-2 py-0.5 rounded inline-block">Accounts Dept</h4>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={accContactName} onChange={(e) => setAccContactName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={accContactPhone} onChange={(e) => setAccContactPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Mobile</Label>
                <Input value={accContactFax} onChange={(e) => setAccContactFax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact E-mail</Label>
                <Input value={accContactEmail} onChange={(e) => setAccContactEmail(e.target.value)} />
              </div>
            </div>

            {/* Warranty Dept */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold border px-2 py-0.5 rounded inline-block">Warranty Dept</h4>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={warContactName} onChange={(e) => setWarContactName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={warContactPhone} onChange={(e) => setWarContactPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Mobile</Label>
                <Input value={warContactFax} onChange={(e) => setWarContactFax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact E-mail</Label>
                <Input value={warContactEmail} onChange={(e) => setWarContactEmail(e.target.value)} />
              </div>
            </div>

          </div>
        </div>

        <div className="rounded border border-slate-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Ordering Details</h3>
          <div className="grid gap-6 lg:grid-cols-[1fr_280px] items-start">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Service Rep</Label>
                <Input value={serviceRep} onChange={(e) => setServiceRep(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} />
              </div>
              {/* <div className="space-y-2">
                <Label>Fax</Label>
                <Input value={fax} onChange={(e) => setFax(e.target.value)} />
              </div> */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={orderEmail} onChange={(e) => setOrderEmail(e.target.value)} />
              </div>
              {/* <div className="space-y-2">
                <Label>Orders Close</Label>
                <Input value={ordersClose} onChange={(e) => setOrdersClose(e.target.value)} />
              </div> */}
              {/* <div className="space-y-2">
                <Label>Min Order Value</Label>
                <Input value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)} />
              </div> */}
              <div className="space-y-2">
                <Label>Freight Cost</Label>
                <Input value={freightCost} onChange={(e) => setFreightCost(e.target.value)} />
              </div>
              {/* <div className="space-y-2">
                <Label>Freight Cuts at</Label>
                <Input value={freightCutsAt} onChange={(e) => setFreightCutsAt(e.target.value)} />
              </div> */}
              {/* <div className="space-y-2">
                <Label>Air Bag Close</Label>
                <Input value={airBagClose} onChange={(e) => setAirBagClose(e.target.value)} />
              </div> */}
              <div className="space-y-2">
                <Label>Air Bag Cost</Label>
                <Input value={airBagCost} onChange={(e) => setAirBagCost(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Landed Factor</Label>
                <Input
                  value={orderLandedFactor}
                  onChange={(e) => setOrderLandedFactor(e.target.value)}
                  type='number'
                />
              </div>
            </div>
            <div className="space-y-6 border-t border-slate-200 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
              <div className="space-y-2">
                <Label>Order Method</Label>
                <div className="flex flex-col gap-2">
                  {(['Post', 
                  // 'Fax', 
                  'Email'] as const).map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="orderMethod"
                        checked={orderMethod === m}
                        onChange={() => setOrderMethod(m)}
                        className="h-3.5 w-3.5 border-slate-300"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>PO Attachment</Label>
                <div className="flex flex-col gap-2">
                  {(['PDF', 'EXCEL', 'BOTH'] as const).map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="poAttachmentType"
                        checked={poAttachmentType === m}
                        onChange={() => setPoAttachmentType(m)}
                        className="h-3.5 w-3.5 border-slate-300"
                      />
                      {m === 'PDF' ? 'PDF' : m === 'EXCEL' ? 'Excel' : 'Both (PDF + Excel)'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dispatch Method</Label>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      'Supplier Carrier',
                      // 'Supplier Air Bag',
                      'Airco Carrier',
                    ] as const
                  ).map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="dispatchMethod"
                        checked={dispatchMethod === m}
                        onChange={() => setDispatchMethod(m)}
                        className="h-3.5 w-3.5 border-slate-300"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
              <Checkbox
                label="Use Supplier PartNumber"
                checked={useSupplierPartNumber}
                onChange={setUseSupplierPartNumber}
              />
            </div>
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50/80 p-4">
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            <div className="flex items-start pt-1">
              <Checkbox
                label="Active Supplier for AAI"
                checked={activeSupplierForAai}
                onChange={setActiveSupplierForAai}
              />
            </div>
            <div className="flex min-w-0 flex-wrap items-end gap-3">
              <Label className="mb-0 shrink-0">Expense Type</Label>
              <div className="w-24 shrink-0">
                <Input
                  value={expenseTypeCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setExpenseTypeCode(v);
                    setExpenseTypeKey(v);
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
                <select
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  value={expenseTypeKey}
                  onChange={(e) => {
                    const code = e.target.value;
                    setExpenseTypeKey(code);
                    setExpenseTypeCode(code);
                  }}
                >
                  {EXPENSE_TYPE_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* Account Status */}
        <div className="rounded border border-slate-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Account Status</h3>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 max-w-sm">
            <Label className="text-right whitespace-nowrap">Credit Limit</Label>
            <Input
  type="number"
  min={0}
  step="0.01"
  value={creditLimit}
  onChange={(e) => setCreditLimit(e.target.value)}
  onBlur={() => {
    const n = parseFloat(creditLimit);
    setCreditLimit(isNaN(n) || n < 0 ? '0.00' : n.toFixed(2));
  }}
  className="text-right"
/>
            <Label className="text-right whitespace-nowrap">Trading Terms</Label>
            <select
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              value={tradingTerms}
              onChange={(e) => setTradingTerms(e.target.value)}
            >
              {['7 Days', '14 Days', '21 Days', '30 Days', '60 Days', '90 Days', 'Prepaid', 'COD'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Label className="text-right whitespace-nowrap">Payment Method</Label>
            <select
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {['Cash', 'Cheque', 'EFT', 'Credit Card', 'Direct Debit'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <Label className="text-right whitespace-nowrap">Biller Code / B.S.B.</Label>
            <Input value={billerCodeBsb} onChange={(e) => setBillerCodeBsb(e.target.value)} />
            <Label className="text-right whitespace-nowrap">Account / Reference</Label>
            <Input value={accountReference} onChange={(e) => setAccountReference(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Supplier'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
