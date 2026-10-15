'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export type Option = {
  label: string;
  value: string;
};

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // ✅ READ-ONLY MODE
  if (disabled) {
    return (
      <div ref={ref} className="relative w-full min-w-0">
        <label className="font-medium text-slate-700 mb-1 block">
          {placeholder}
        </label>

        <div
          className={cn(
            'w-full h-9 border rounded-md px-3 flex items-center text-sm bg-slate-50',
            'whitespace-nowrap overflow-hidden truncate text-slate-700',
          )}
        >
          {selected?.label || '-'}
        </div>
      </div>
    );
  }
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () =>
      document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <label className="font-medium text-slate-700 mb-1 block">
        {placeholder}
      </label>

      <div
        className={cn(
          'w-full h-9 border rounded-md px-3 flex items-center text-sm bg-white cursor-pointer',
          'whitespace-nowrap overflow-hidden truncate', //FIX
          !selected && 'text-slate-400',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        {selected?.label || placeholder}
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full border rounded-md bg-white shadow">
          <input
            autoFocus
            className="w-full px-3 py-2 text-sm border-b outline-none"
            placeholder="Type to search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlighted(h =>
                  Math.min(h + 1, filtered.length - 1),
                );
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlighted(h => Math.max(h - 1, 0));
              }

              if (e.key === 'Enter') {
                e.preventDefault();
                const sel = filtered[highlighted];
                if (sel) {
                  onChange(sel.value);
                  setOpen(false);
                  setQuery('');
                }
              }

              if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
          />

          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">
                No results
              </div>
            )}

            {filtered.map((o, idx) => (
              <div
                key={o.value}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer',
                  idx === highlighted && 'bg-slate-100',
                )}
                onMouseEnter={() => setHighlighted(idx)}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery('');
                }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
