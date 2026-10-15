'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '../ui/toast';

export type LandingOption = {
  key: string;
  label: string;
  description?: string;
};

type Props = {
  value?: string | null;
  options?: LandingOption[];
  disabled?: boolean;
  saving?: boolean;
  onChange: (newValue: string) => Promise<void> | void;
};

export default function DefaultLandingSelector({
  value = null,
  options = [
    { key: 'Dashboard', label: 'Dashboard', description: 'Standard admin dashboard' },
    { key: 'FieldServices', label: 'Field Services', description: 'Technician mobile-first view' },
  ],
  disabled = false,
  saving = false,
  onChange,
}: Props) {
  const [selected, setSelected] = useState<string | null>(value ?? null);
  const [localSaving, setLocalSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setSelected(value ?? null);
  }, [value]);

  // const handleSelect = async (key: string) => {
  //   if (disabled || localSaving) return;
  //   if (key === selected) return;

  //   // optimistic update
  //   setSelected(key);
  //   setLocalSaving(true);

  //   try {
  //     const maybePromise = onChange(key);
  //     if (maybePromise && typeof (maybePromise as any).then === 'function') {
  //       await maybePromise;
  //     }
  //     showToast?.({ type: 'success', title: 'Saved', message: 'Default landing page updated.' });
  //   } catch (err: any) {
  //     // rollback on error
  //     setSelected(value ?? null);
  //     const msg = err?.message ?? 'Failed to update default landing';
  //     showToast?.({ type: 'error', title: 'Save failed', message: msg });
  //   } finally {
  //     setLocalSaving(false);
  //   }
  // };

  const handleSelect = async (key: string) => {
    if (disabled || localSaving) return;
    if (key === selected) return;

    setSelected(key);
    setLocalSaving(true);

    try {
      const maybePromise = onChange(key);
      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        await maybePromise;
      }
    } catch (err) {
      // rollback on error
      setSelected(value ?? null);
      throw err; // let ProfilePage handle toast
    } finally {
      setLocalSaving(false);
    }
  };


  const isBusy = localSaving || saving;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Defaults</h3>
        {isBusy ? (
          <div className="text-xs text-slate-500">Saving…</div>
        ) : (
          <div className="text-xs text-slate-400">Choose where you land after login</div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {options.map((opt) => {
          const checked = selected === opt.key;
          return (
            <label
              key={opt.key}
              className={`flex items-start gap-3 cursor-pointer rounded-md p-3 transition-shadow ${checked ? 'ring-2 ring-aqua/30 bg-aqua/5' : 'hover:shadow-sm'
                } ${disabled || isBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
              aria-pressed={checked}
            >
              <input
                type="radio"
                name="defaultLanding"
                value={opt.key}
                checked={checked}
                disabled={disabled || isBusy}
                onChange={() => handleSelect(opt.key)}
                className="mt-1 h-4 w-4 text-aqua focus:ring-aqua"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-900">{opt.label}</div>
                </div>
                {opt.description && <div className="text-xs text-slate-500 mt-1">{opt.description}</div>}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
