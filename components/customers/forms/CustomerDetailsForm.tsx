'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Select } from '../../ui/select';
import { AbnLookup } from '../../common/AbnLookup'
import { ArrowUpRight } from 'lucide-react'

export function CustomerDetailsForm({
  customerId,
  initialData,
  onSaved,
}: {
  customerId?: string;
  initialData?: any;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  //const [status, setStatus] = useState<string | undefined>();
  const [form, setForm] = useState({
    name: '',
    registeredName: '',
    abn: '',
    status: 'ACTIVE',
    fmCustomerNumber: '',
    orderRequired: false,
    gstExempt: false,
    isGeneric: false,
    requiresShippingDetails: false,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData) return;

    setForm({
      name: initialData.name || '',
      registeredName: initialData.registeredName || '',
      abn: initialData.abn || '',
      status: initialData.status || 'ACTIVE',
      fmCustomerNumber: initialData.fmCustomerNumber || '',
      orderRequired: initialData.orderRequired || false,
      gstExempt: !!initialData.gstExempt,
      isGeneric: !!initialData.isGeneric,
      requiresShippingDetails: !!initialData.requiresShippingDetails,
    });
  }, [initialData]);

  const update = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.abn.trim()) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'ABN is required',
      });
      return;
    }

    const abn = form.abn.trim();

    // Only numbers check
    if (!/^\d+$/.test(abn)) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'ABN must contain numbers only',
      });
      return;
    }

    // Exact 11 digits check
    if (abn.length !== 11) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'ABN must be exactly 11 digits',
      });
      return;
    }

    if (!form.registeredName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Registered Name is required',
      });
      return;
    }

    if (!form.name.trim()) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Customer Name is required',
      });
      return;
    }

    // if (!form.fmCustomerNumber.trim()) {
    //   showToast({
    //     type: 'error',
    //     title: 'Validation error',
    //     message: 'FM Customer Number is required',
    //   });
    //   return;
    // }


    setSaving(true);

    try {
      if (customerId) {
        await api.patch(`/customers/${customerId}/details`, form);
        showToast({ type: 'success', title: 'Customer updated' });
        onSaved?.();
      } else {
        const res = await api.post('/customers', form);
        const newId = res.data?.data?.id;

        if (!newId) throw new Error('Customer ID missing');

        showToast({ type: 'success', title: 'Customer created' });
        router.replace(`/customers/${newId}`);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message || 'Unexpected error',
      });
    } finally {
      setSaving(false);
    }
  };
  const cancel = () => {
    router.push('/customers');
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">

        <AbnLookup
          label="ABN"
          value={form.abn}
          onChange={v => update('abn', v)}
          onSelect={r => {
            setForm(f => ({
              ...f,
              abn: r.Abn,
              registeredName: r.Name,
              gstExempt: r.Gst === 'N',
            }))
          }}
        />


        <Input
          label="Registered Name"
          required
          placeholder="Registered business name"
          value={form.registeredName}
          onChange={e => update('registeredName', e.target.value)}
        />

        <Input
          label="Customer Name"
          required
          placeholder="Enter customer name"
          sanitizeType="name"
          value={form.name}
          onChange={e => update('name', e.target.value)}
        />

        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm">
              FM Customer Number
            </label>

            {initialData?.fmCustomer?.id && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/fm-customers/${initialData.fmCustomer.id}/view`
                  )
                }
                className="text-slate-400 hover:text-slate-700 transition"
                title="Open FM Customer"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <Input
            readOnly
            value={form.fmCustomerNumber || ''}
            placeholder="External system reference"
          />
        </div>

        <Select
          placeholder="Customer Status"
          value={form.status}
          onChange={(v) => {
            update('status', v)
            if (v === 'STOP_CREDIT') {
              update('creditHold', true)
            } else {
              update('creditHold', false)
            }
          }}

          options={[
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Inactive', value: 'INACTIVE' },
            { label: 'Overdue', value: 'OVERDUE' },
            { label: 'Credit Hold', value: 'STOP_CREDIT' },
            { label: 'Closed', value: 'CLOSED' },
          ]}
        />

        <Checkbox
          label="Order Required (PO mandatory)"
          checked={form.orderRequired}
          onChange={v => update('orderRequired', v)}
        />

        <Checkbox
          label="Generic Customer (for walk-in / Free Hand Invoices)"
          checked={form.isGeneric}
          onChange={v => update('isGeneric', v)}
        />

        {form.isGeneric && (
          <Checkbox
            label="Requires Shipping Details on each Invoice (e.g. Postal/web sales account)"
            checked={form.requiresShippingDetails}
            onChange={v => update('requiresShippingDetails', v)}
          />
        )}
        
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={cancel}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button onClick={submit} loading={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}
