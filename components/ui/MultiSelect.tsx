'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './input';
import { cn } from '../../lib/utils';

type Option = { label: string; value: string };

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  required = false
}: {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const isInvalid = required && !disabled && value.length === 0;

  useEffect(() => {
    if (disabled) return;

    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [disabled]);

  const filtered = useMemo(
    () =>
      options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
      ),
    [options, search]
  );

  const toggle = (v: string) => {
    if (disabled) return;

    onChange(
      value.includes(v)
        ? value.filter(x => x !== v)
        : [...value, v]
    );
  };

  const selectedLabels = useMemo(
    () => options.filter(o => value.includes(o.value)).map(o => o.label),
    [options, value]
  );

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-required={required}
        aria-invalid={isInvalid}
        onClick={() => !disabled && setOpen(o => !o)}
        className={cn(
          'w-full h-9 rounded-md border px-3 text-left text-sm',
          'focus:outline-none',
          disabled &&
            'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed',
          !disabled &&
            'bg-white focus:ring-2 focus:ring-indigo-500',
          isInvalid
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-200'
        )}
      >
        {value.length === 0 && placeholder}

        {value.length > 0 && disabled && (
          <span className="truncate">{selectedLabels.join(', ')}</span>
        )}

        {value.length > 0 && !disabled && (
          <span>{value.length} selected</span>
        )}
      </button>

      {isInvalid && (
        <div className="mt-1 text-xs text-red-600">
          This field is required
        </div>
      )}

      {!disabled && open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="max-h-48 overflow-auto p-2 space-y-1">
            {filtered.map(o => (
              <label
                key={o.value}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

