'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Search } from 'lucide-react';
import { jobBookEntryApi } from '../../../lib/job-book-entry-client';
import { useToast } from '../../ui/toast';
import { Button } from '../../ui/button';
import { useAuth } from '../../../providers/auth-provider';
import { emptyJobBookEntry, JobBookEntryFormState } from './types';

function currentUserLabel(user: {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
} | null | undefined) {
  if (!user) return '';
  const display = String(user.displayName || '').trim();
  if (display) return display;
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (full) return full;
  return String(user.email || '').trim();
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink';

/** Legacy JobBook Service Details block */
function buildServiceDetailsBlock(
  fields: Pick<
    JobBookEntryFormState,
    'itemDetails' | 'regoFleetNum' | 'odometers' | 'serialNumber' | 'constantK'
  >,
  freeNotes: string,
) {
  const notes = String(freeNotes || '').replace(/^\n+/, '');
  return [
    `Item Details: ${String(fields.itemDetails || '').trim()}`,
    `Rego / F1 Num: ${String(fields.regoFleetNum || '').trim()}`,
    `Odometer Reading: ${String(fields.odometers || '').trim()}`,
    `Serial Number: ${String(fields.serialNumber || '').trim()}`,
    `Calibration K=: ${String(fields.constantK || '').trim()}`,
    `Service Details:`,
    notes,
  ].join('\n');
}

function extractServiceNotes(text?: string | null) {
  const raw = String(text || '');
  if (!raw.trim()) return '';
  const marker = /Service Details:\s*/i;
  const match = raw.match(marker);
  if (match && match.index != null) {
    return raw.slice(match.index + match[0].length).replace(/^\r?\n/, '');
  }
  // Plain free text (no structured header yet)
  if (!/^Item Details:/im.test(raw)) return raw;
  return '';
}

const TECH_KEYS = [
  'itemDetails',
  'regoFleetNum',
  'odometers',
  'serialNumber',
  'constantK',
] as const;

export function JobBookEntryForm({
  initial,
  mode,
}: {
  initial?: JobBookEntryFormState;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const seed = initial || emptyJobBookEntry();
  const [form, setForm] = useState<JobBookEntryFormState>(() => {
    const notes = extractServiceNotes(seed.serviceDetails);
    const hasStructure = /^Item Details:/im.test(String(seed.serviceDetails || ''));
    const jobNumber =
      String(seed.jobNumber || '').trim() ||
      String(seed.jobNum || '').trim() ||
      String(seed.entryNumber || '').trim() ||
      '';
    return {
      ...seed,
      jobNumber,
      jobNum: String(seed.jobNum || jobNumber || '').trim(),
      serviceDetails: hasStructure
        ? String(seed.serviceDetails || '')
        : buildServiceDetailsBlock(seed, notes),
    };
  });
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  // Keep form in sync when edit page finishes loading initial payload
  useEffect(() => {
    if (!initial?.id) return;
    const notes = extractServiceNotes(initial.serviceDetails);
    const hasStructure = /^Item Details:/im.test(String(initial.serviceDetails || ''));
    const jobNumber =
      String(initial.jobNumber || '').trim() ||
      String(initial.jobNum || '').trim() ||
      String(initial.entryNumber || '').trim() ||
      '';
    setForm({
      ...initial,
      jobNumber,
      jobNum: String(initial.jobNum || jobNumber || '').trim(),
      serviceDetails: hasStructure
        ? String(initial.serviceDetails || '')
        : buildServiceDetailsBlock(initial, notes),
    });
  }, [initial?.id]);

  // Auto-fill User from logged-in account (Author on list)
  useEffect(() => {
    const label = currentUserLabel(user);
    if (!label) return;
    setForm((prev) => {
      if (mode === 'create' && !String(prev.userName || '').trim()) {
        return { ...prev, userName: label };
      }
      // New entry seed may already have empty userName — fill once auth loads
      if (!String(prev.userName || '').trim()) {
        return { ...prev, userName: label };
      }
      return prev;
    });
  }, [user, mode]);

  const set = (key: keyof JobBookEntryFormState, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if ((TECH_KEYS as readonly string[]).includes(key)) {
        // Keep free text under "Service Details:" while refreshing labeled lines
        const notes = extractServiceNotes(prev.serviceDetails);
        return {
          ...next,
          serviceDetails: buildServiceDetailsBlock(next, notes),
        };
      }
      return next;
    });
  };

  const onServiceDetailsChange = (text: string) => {
    setForm((prev) => ({ ...prev, serviceDetails: text }));
  };

  const lookupCustomer = async () => {
    const number = String(form.customerNumber || '').trim();
    if (!number) {
      showToast({ type: 'error', title: 'Enter a customer number first', replace: true });
      return;
    }
    setLookingUp(true);
    try {
      const res = await jobBookEntryApi.lookupCustomer(number);
      if (res.error || !res.data) {
        showToast({
          type: 'error',
          title: res.error?.message || 'Customer not found',
          replace: true,
        });
        return;
      }
      const d = res.data as any;
      // ResponseInterceptor may nest again
      const payload = d?.customerNumber ? d : d?.data || d;
      setForm((prev) => ({
        ...prev,
        ...payload,
        customerNumber: payload.customerNumber || number,
      }));
      showToast({
        type: 'success',
        title: `Loaded ${payload.customerName || payload.customerNumber}`,
        replace: true,
      });
    } finally {
      setLookingUp(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!String(form.customerNumber || '').trim()) {
      showToast({ type: 'error', title: 'Customer Number is required', replace: true });
      return;
    }
    setSaving(true);
    try {
      // Ensure labeled block is current before save
      const notes = extractServiceNotes(form.serviceDetails);
      const payload = {
        ...form,
        userName: form.userName?.trim() || currentUserLabel(user) || form.userName,
        serviceDetails: buildServiceDetailsBlock(form, notes),
      };
      const res =
        mode === 'edit' && payload.id
          ? await jobBookEntryApi.update(payload.id, payload)
          : await jobBookEntryApi.create(payload);
      if (res.error || !res.data) {
        showToast({
          type: 'error',
          title: res.error?.message || 'Could not save entry',
          replace: true,
        });
        return;
      }
      const saved: any = res.data?.id ? res.data : (res.data as any)?.data || res.data;
      const jobNo = saved?.jobNumber || saved?.jobNum || '';
      showToast({
        type: 'success',
        title: jobNo
          ? `Saved — Job Number ${jobNo}`
          : mode === 'edit'
            ? 'Entry updated'
            : 'Entry created',
        replace: true,
      });
      // Stay on entry so Job Number field shows the generated value
      if (saved?.id) {
        setForm((prev) => ({
          ...prev,
          ...saved,
          id: saved.id,
          entryNumber: saved.entryNumber || prev.entryNumber,
          jobNumber: saved.jobNumber || prev.jobNumber,
          jobNum: saved.jobNum || saved.jobNumber || prev.jobNum,
        }));
        if (mode === 'create') {
          router.replace(`/job-boards/job-book-entry/${saved.id}`);
        }
      } else {
        router.push('/job-boards/job-book-entry');
      }
    } finally {
      setSaving(false);
    }
  };

  const completionLocal = form.completionTime
    ? (() => {
        try {
          const d = new Date(form.completionTime);
          if (Number.isNaN(d.getTime())) return '';
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          return '';
        }
      })()
    : '';

  return (
    <form onSubmit={onSubmit} className="space-y-3 pb-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">
          {mode === 'edit' ? 'Edit Job Book Entry' : 'New Job Book Entry'}
        </h1>
        <p className="text-xs text-slate-500">
          {form.entryNumber
            ? `Entry ${form.entryNumber}`
            : 'Customer details auto-fill when you look up a customer number.'}
        </p>
      </div>

      {/* Header: customer + shipping + account */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Field label="Customer Number">
            <div className="flex gap-1">
              <input
                className={inputCls}
                value={form.customerNumber || ''}
                onChange={(e) => set('customerNumber', e.target.value)}
                onBlur={() => {
                  if (form.customerNumber?.trim()) void lookupCustomer();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void lookupCustomer();
                  }
                }}
                placeholder="Enter / select number"
                required
              />
              <button
                type="button"
                onClick={() => void lookupCustomer()}
                disabled={lookingUp}
                className="shrink-0 px-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100"
                title="Look up customer"
              >
                {lookingUp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </Field>
          <Field label="Order Number">
            <input className={inputCls} value={form.orderNumber || ''} onChange={(e) => set('orderNumber', e.target.value)} />
          </Field>
          <Field label="A.B.N. Entry">
            <input className={inputCls} value={form.abn || ''} onChange={(e) => set('abn', e.target.value)} />
          </Field>
          <Field label="Terms of Trade">
            <input className={inputCls} value={form.termsOfTrade || ''} onChange={(e) => set('termsOfTrade', e.target.value)} />
          </Field>
        </div>

        {form.customerName ? (
          <p className="text-xs text-blue-700 font-medium">Customer: {form.customerName}</p>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <fieldset className="rounded-lg border border-slate-200 p-2.5 space-y-2">
            <legend className="px-1 text-[11px] font-bold uppercase text-slate-600">Shipping Details</legend>
            <Field label="Name">
              <input className={inputCls} value={form.shippingName || ''} onChange={(e) => set('shippingName', e.target.value)} />
            </Field>
            <Field label="Address 1">
              <input className={inputCls} value={form.shippingAddress1 || ''} onChange={(e) => set('shippingAddress1', e.target.value)} />
            </Field>
            <Field label="Address 2">
              <input className={inputCls} value={form.shippingAddress2 || ''} onChange={(e) => set('shippingAddress2', e.target.value)} />
            </Field>
            <Field label="Address 3">
              <input className={inputCls} value={form.shippingAddress3 || ''} onChange={(e) => set('shippingAddress3', e.target.value)} />
            </Field>
          </fieldset>

          <fieldset className="rounded-lg border border-slate-200 p-2.5 space-y-2">
            <legend className="px-1 text-[11px] font-bold uppercase text-slate-600">Account Details</legend>
            <Field label="Name">
              <input className={inputCls} value={form.accountName || ''} onChange={(e) => set('accountName', e.target.value)} />
            </Field>
            <Field label="Address 1">
              <input className={inputCls} value={form.accountAddress1 || ''} onChange={(e) => set('accountAddress1', e.target.value)} />
            </Field>
            <Field label="Address 2">
              <input className={inputCls} value={form.accountAddress2 || ''} onChange={(e) => set('accountAddress2', e.target.value)} />
            </Field>
            <Field label="Address 3">
              <input className={inputCls} value={form.accountAddress3 || ''} onChange={(e) => set('accountAddress3', e.target.value)} />
            </Field>
          </fieldset>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Field label="Last Entry Date">
            <input
              type="date"
              className={inputCls}
              value={form.lastEntryDate || ''}
              onChange={(e) => set('lastEntryDate', e.target.value)}
            />
          </Field>
          <Field label="Job Num">
            <input className={inputCls} value={form.jobNum || ''} onChange={(e) => set('jobNum', e.target.value)} />
          </Field>
          <Field label="In House">
            <input className={inputCls} value={form.inHouse || ''} onChange={(e) => set('inHouse', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
          <Field label="Contact Name">
            <input className={inputCls} value={form.contactName || ''} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone Number">
              <input className={inputCls} value={form.phoneNumber || ''} onChange={(e) => set('phoneNumber', e.target.value)} />
            </Field>
            <Field label="Completion Time">
              <input
                type="datetime-local"
                className={inputCls}
                value={completionLocal}
                onChange={(e) =>
                  set('completionTime', e.target.value ? new Date(e.target.value).toISOString() : '')
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Previous Job">
              <input className={inputCls} value={form.previousJob || ''} onChange={(e) => set('previousJob', e.target.value)} />
            </Field>
            <label className="flex items-end gap-2 pb-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!form.warranty}
                onChange={(e) => set('warranty', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-ink accent-ink focus:ring-ink focus:ring-offset-0"
              />
              Warranty
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Inward Freight">
              <input className={inputCls} value={form.inwardFreight || ''} onChange={(e) => set('inwardFreight', e.target.value)} />
            </Field>
            <Field label="Freight Method">
              <input
                className={inputCls}
                value={form.freightMethod || ''}
                onChange={(e) => set('freightMethod', e.target.value)}
                placeholder="Select or type method"
              />
            </Field>
            <Field label="Outward Freight">
              <input className={inputCls} value={form.outwardFreight || ''} onChange={(e) => set('outwardFreight', e.target.value)} />
            </Field>
          </div>

          <Field label="Item Details">
            <textarea
              className={`${inputCls} min-h-[88px] resize-y`}
              value={form.itemDetails || ''}
              onChange={(e) => set('itemDetails', e.target.value)}
              placeholder="e.g. Bus Instrument Cluster"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Rego - Fleet Num">
              <input
                className={inputCls}
                value={form.regoFleetNum || ''}
                onChange={(e) => set('regoFleetNum', e.target.value)}
                placeholder="e.g. ABC123"
              />
            </Field>
            <Field label="Odometers">
              <input
                className={inputCls}
                value={form.odometers || ''}
                onChange={(e) => set('odometers', e.target.value)}
                placeholder="e.g. 123456"
              />
            </Field>
            <Field label="Serial Number">
              <input
                className={inputCls}
                value={form.serialNumber || ''}
                onChange={(e) => set('serialNumber', e.target.value)}
              />
            </Field>
            <Field label="Constant K=">
              <input
                className={inputCls}
                value={form.constantK || ''}
                onChange={(e) => set('constantK', e.target.value)}
                placeholder="Calibration K="
              />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2 flex flex-col">
          <Field label="Service Details" className="flex-1">
            <textarea
              className={`${inputCls} min-h-[280px] h-full resize-y font-mono text-[11px] leading-relaxed`}
              value={form.serviceDetails || ''}
              onChange={(e) => onServiceDetailsChange(e.target.value)}
              placeholder={[
                'Item Details:',
                'Rego / F1 Num:',
                'Odometer Reading:',
                'Serial Number:',
                'Calibration K=:',
                'Service Details:',
                'Repair the Speedometer',
              ].join('\n')}
            />
          </Field>
          <p className="text-[10px] text-slate-500">
            Type freely below <span className="font-semibold">Service Details:</span>. Left-side Item /
            Rego / Odometer / Serial / K fields refresh the labeled lines above it.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <Field label="User">
              <input
                className={`${inputCls} bg-amber-50 font-semibold`}
                value={form.userName || ''}
                onChange={(e) => set('userName', e.target.value)}
                placeholder="Logged-in user"
                title="Defaults to the signed-in user (Author)"
              />
            </Field>
            <Field label="Repairer">
              <input className={inputCls} value={form.repairer || ''} onChange={(e) => set('repairer', e.target.value)} />
            </Field>
            <Field label="Job Number">
              <input
                className={`${inputCls} bg-slate-50 font-mono font-semibold`}
                value={form.jobNumber || form.jobNum || form.entryNumber || ''}
                readOnly
                placeholder={mode === 'edit' ? 'Loading…' : 'Assigned automatically on Save'}
                title="Job Number is created automatically when you save"
              />
            </Field>
            <Field label="Invoice Num">
              <input className={inputCls} value={form.invoiceNum || ''} onChange={(e) => set('invoiceNum', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Bottom actions — same placement/color as other AIMS forms */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/job-boards/job-book-entry')}
        >
          Back
        </Button>
        <Button type="submit" variant="primary" loading={saving} className="gap-1.5 min-w-[96px]">
          {!saving && <Save className="w-3.5 h-3.5" />}
          Save
        </Button>
      </div>
    </form>
  );
}
