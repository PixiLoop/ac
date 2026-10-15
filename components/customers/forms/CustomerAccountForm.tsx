'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';

export function CustomerAccountForm({
  customerId,
}: {
  customerId: string;
}) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    creditLimit: '',
    creditHold: false,
    creditHoldReason: '',
    currentBalance: 0,
  });

  const [saving, setSaving] = useState(false);

  // Load existing account data
  const load = async () => {
    try {
      const res = await api.get(`/customers/${customerId}`);
      const c = res.data.data;

      setForm({
        creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
        creditHold: !!c.creditHold,
        creditHoldReason: c.creditHoldReason ?? '',
        currentBalance: c.currentBalance ?? 0,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load account details',
      });
    }
  };

  useEffect(() => {
    if (customerId) load();
  }, [customerId]);

  const save = async () => {
    if (!form.creditLimit.trim()) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Credit limit is required',
      });
      return;
    }

    if (isNaN(Number(form.creditLimit))) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Please enter a valid credit limit',
      });
      return;
    }

    if (form.creditHold && !form.creditHoldReason.trim()) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Credit hold reason is required',
      });
      return;
    }

    setSaving(true);

    try {
      await api.patch(`/customers/${customerId}/account`, {
        creditLimit:
          form.creditLimit === '' ? null : Number(form.creditLimit),
        creditHold: form.creditHold,
        creditHoldReason: form.creditHold
          ? form.creditHoldReason
          : null,
      });

      showToast({
        type: 'success',
        title: 'Account details updated',
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

  const handleCreditLimitChange = (value: string) => {
    // Allows empty input, integers, and up to 2 decimal places (e.g., 100, 100.5, 100.50)
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setForm(f => ({ ...f, creditLimit: value }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Credit Limit"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={form.creditLimit}
          onChange={e => handleCreditLimitChange(e.target.value)}
        />

        <Input
          label="Current Balance"
          value={form.currentBalance}
          disabled
        />
      </div>

      <Checkbox
        label="Credit hold"
        checked={form.creditHold}
        onChange={v =>
          setForm(f => ({ ...f, creditHold: v }))
        }
      />

      {form.creditHold && (
        <Input
          label="Credit hold reason"
          value={form.creditHoldReason}
          onChange={e =>
            setForm(f => ({
              ...f,
              creditHoldReason: e.target.value,
            }))
          }
        />
      )}

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}