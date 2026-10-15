'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import { Select } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';

export type CustomerPaymentValue = {
  accountType?: string;
  paymentTerms?: string;
  priceLevel?: string;
  salesFactor?: string;

  paymentMethod?: string;
  gstExempt?: boolean;

  bankAccountName?: string;
  bankAccountNo?: string;
  bankBsb?: string;
  bankName?: string;

  dispatchMethod?: string;
  dispatchAccountNo?: string;
  dispatchAccountName?: string;
  dispatchCharge?: string;
  dispatchReference?: string;
};

export function CustomerPaymentForm({
  customerId,
}: {
  customerId: string;
}) {
  const { showToast } = useToast();

  const [form, setForm] = useState<CustomerPaymentValue>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof CustomerPaymentValue, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ================= LOAD ================= */
  const load = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}`);
      const c = res.data.data;

      setForm({
        accountType: c.accountType ?? '',
        paymentTerms: c.paymentTerms ?? 'DAYS_30',
        priceLevel: c.priceLevel ?? 'RETAIL',
        salesFactor: c.salesFactor?.toString() ?? '',

        paymentMethod: c.paymentMethod ?? '',
        gstExempt: !!c.gstExempt,

        bankAccountName: c.bankAccountName ?? '',
        bankAccountNo: c.bankAccountNo ?? '',
        bankBsb: c.bankBsb ?? '',
        bankName: c.bankName ?? '',

        dispatchMethod: c.dispatchMethod ?? '',
        dispatchAccountNo: c.dispatchAccountNo ?? '',
        dispatchAccountName: c.dispatchAccountName ?? '',
        dispatchCharge: c.dispatchCharge?.toString() ?? '',
        dispatchReference: c.dispatchReference ?? '',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load payment details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  /* ================= SAVE ================= */
  const save = async () => {
    if (!customerId) return;

    if (form.salesFactor) {
      const sf = Number(form.salesFactor);
      if (isNaN(sf) || sf >= 10000 || sf < 0) {
        showToast({
          type: 'error',
          title: 'Sales Factor must be a number between 0 and 9999.99',
        });
        return;
      }
      // Clamp to 2 decimal places to avoid precision overflow
      form.salesFactor = parseFloat(sf.toFixed(2)).toString();
    }

    const requiredFields: { key: keyof CustomerPaymentValue; label: string }[] = [
      { key: 'accountType', label: 'Account Type' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'priceLevel', label: 'Price Level' },
      { key: 'salesFactor', label: 'Sales Factor' },
      //{ key: 'bankAccountName', label: 'Bank Account Name' },
      //{ key: 'bankAccountNo', label: 'Bank Account Number' },
      //{ key: 'bankBsb', label: 'BSB' },
      //{ key: 'bankName', label: 'Bank Name' },
    ];

    for (const field of requiredFields) {
      const value = form[field.key];

      if (!value || value.toString().trim() === '') {
        showToast({
          type: 'error',
          title: `${field.label} is required`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      await api.patch(`/customers/${customerId}/payment`, {
        ...form,
        salesFactor: form.salesFactor
          ? Number(form.salesFactor)
          : null,
        dispatchCharge: form.dispatchCharge
          ? Number(form.dispatchCharge)
          : null,
      });

      showToast({
        type: 'success',
        title: 'Payment details updated',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">

        {/* ROW 1 */}
        <Select
          label='Account Type'
          placeholder="Account Type"
          value={form.accountType}
          onChange={(v) => update('accountType', v)}
          options={[
            { label: 'Main', value: 'Main' },
            { label: 'Depot', value: 'Depot' },
          ]}
        />

        <Select
          label="Payment Method"
          placeholder="Payment Method"
          value={form.paymentMethod}
          onChange={(v) => update('paymentMethod', v)}
          options={[
            { label: 'Cash', value: 'Cash' },
            { label: 'EFT', value: 'EFT' },
            { label: 'Credit Card', value: 'Credit Card' },
            { label: 'MOTO', value: 'MOTO' },
          ]}
        />

        <div className="flex items-center pt-2">
          <Checkbox
            label="GST Exempt"
            checked={!!form.gstExempt}
            onChange={(v) => update('gstExempt', v)}
          />
        </div>

        {/* ROW 2 */}
        <Select
          label="Payment Terms"
          placeholder="Payment Terms"
          value={form.paymentTerms}
          onChange={(v) => update('paymentTerms', v)}
          options={[
            { label: '14 Days', value: 'DAYS_14' },
            { label: '30 Days', value: 'DAYS_30' },
            { label: '60 Days', value: 'DAYS_60' },
            { label: '90 Days', value: 'DAYS_90' },
            { label: 'COD', value: 'COD' },
            { label: 'PAY NOW', value: 'PAY_NOW' },
          ]}
        />

        <Select
          label="Price Level"
          placeholder="Price Level"
          value={form.priceLevel}
          onChange={(v) => update('priceLevel', v)}
          options={[
            { label: 'Retail', value: 'RETAIL' },
            { label: 'Trade', value: 'TRADE' },
            { label: 'Sales Partner', value: 'SALES_PARTNER' },
            { label: 'Agent', value: 'AGENT' },
          ]}
        />

        <Input
          label="Sales Factor"
          placeholder="Sales Factor"
          value={form.salesFactor ?? ''}
          onChange={(e) => update('salesFactor', e.target.value)}
        />

        {/* <Input
          label="Bank Account Name"
          placeholder="Bank Account Name"
          value={form.bankAccountName ?? ''}
          onChange={(e) => update('bankAccountName', e.target.value)}
        />        

        <Input
          label="Bank Account Number"
          numeric
          maxDigits={12}
          placeholder="Bank Account Number"
          value={form.bankAccountNo ?? ''}
          onChange={(e) => update('bankAccountNo', e.target.value)}
        />

        <Input
          label="BSB"
          numeric
          maxDigits={12}
          placeholder="BSB"
          value={form.bankBsb ?? ''}
          onChange={(e) => update('bankBsb', e.target.value)}
        />
 
        <Input
          label="Bank Name"
          className="col-span-3"
          placeholder="Bank Name"
          value={form.bankName ?? ''}
          onChange={(e) => update('bankName', e.target.value)}
        />*/}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} disabled={loading}>
          Save
        </Button>
      </div>
    </div>

  );
}
