'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api-client';
import { Button } from '../../ui/button';
import { useToast } from '../../ui/toast';
import { Input } from '../../ui/input';
import { Select } from '../../ui/select';
 
let cachedDispatchMethods: { label: string; value: string }[] | null = null;
let cacheInflight: Promise<{ label: string; value: string }[]> | null = null;

export async function fetchDispatchMethodOptions(): Promise<{ label: string; value: string }[]> {
  if (cachedDispatchMethods) return cachedDispatchMethods;
  if (cacheInflight) return cacheInflight;

  cacheInflight = api.get('/dispatch-methods', { params: { activeOnly: 'true' } })
    .then(res => {
      const list = res.data?.data ?? res.data ?? [];
      const options = list.map((m: any) => ({ label: m.label, value: m.code }));
      cachedDispatchMethods = options;
      return options;
    })
    .catch(() => [])
    .finally(() => { cacheInflight = null; });

  return cacheInflight;
}
 
export function invalidateDispatchMethodCache() {
  cachedDispatchMethods = null;
}
 
export const DISPATCH_METHOD_OPTIONS: { label: string; value: string }[] = [];

export function CustomerDispatchForm({
  customerId,
  initialData,
  existingDispatches,
  onClose,
  onSaved,
  readOnly = false,
  onSwitchToEdit,
}: any) {
  const { showToast } = useToast();

  const [form, setForm] = useState(
    initialData ?? {
      method: '',
      accountNo: '',
      accountName: '',
      charge: '',
      reference: '',
      isDefault: false,
    },
  );

  const [methodOptions, setMethodOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    fetchDispatchMethodOptions().then(opts => {
      setMethodOptions(opts);
      // Default new-form method to the first active option once loaded.
      setForm((f: any) => (f.method ? f : { ...f, method: opts[0]?.value ?? '' }));
    });
  }, []);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!form.method) {
      showToast({ type: 'error', title: 'Dispatch Method is required' });
      return;
    }
    if (!form.accountNo.trim()) {
      showToast({ type: 'error', title: 'Dispatch Account No is required' });
      return;
    }
    if (!form.accountName.trim()) {
      showToast({ type: 'error', title: 'Dispatch Account Name is required' });
      return;
    }
    if (!form.charge.trim()) {
      showToast({ type: 'error', title: 'Dispatch Charge is required' });
      return;
    }

    const updated = initialData
      ? existingDispatches.map(d =>
        d.id === form.id ? form : d,
      )
      : [...existingDispatches, form];

    await api.patch(`/customers/${customerId}/dispatches`, {
      dispatches: updated,
    });

    showToast({
      type: 'success',
      title: 'Dispatch saved',
    });

    onSaved();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          
          <div>
            <label className="text-sm font-medium text-slate-700">
              Dispatch Method
            </label>
            <Select
              value={form.method}
              options={methodOptions}
              onChange={(v: string) => setForm({ ...form, method: v })}
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Dispatch Account No
            </label>
            <Input
              className="input"
              maxDigits={12}
              placeholder="Dispatch Account No"
              value={form.accountNo ?? ''}
              onChange={e =>
                setForm({ ...form, accountNo: e.target.value })
              }
              readOnly={readOnly}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Dispatch Account Name
            </label>
            <input
              className="input"
              placeholder="Dispatch Account Name"
              value={form.accountName ?? ''}
              onChange={e =>
                setForm({
                  ...form,
                  accountName: e.target.value,
                })
              }
              readOnly={readOnly}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Dispatch Charge
            </label>
            <Input
              className="input"
              placeholder="Dispatch Charge"
              decimal
              maxDigits={8}
              maxDecimals={2}
              value={form.charge ?? ''}
              onChange={e =>
                setForm({
                  ...form,
                  charge: e.target.value,
                })
              }
              readOnly={readOnly}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Dispatch Reference
            </label>
            <input
              className="input"
              placeholder="Dispatch Reference"
              value={form.reference ?? ''}
              onChange={e =>
                setForm({
                  ...form,
                  reference: e.target.value,
                })
              }
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          {readOnly ? (
          <>
            <Button variant="outline" onClick={() => onSwitchToEdit?.()}>Edit</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        )}
        </div>
      </div>
    </form>
  );

}
