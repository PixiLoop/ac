'use client';

import { cn } from '../../lib/utils';

export function Radio({
  label,
  value,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 text-sm text-slate-700 cursor-pointer',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      <input
        type="radio"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="h-4 w-4 border-slate-300 text-aqua focus:ring-aqua"
      />
      {label}
    </label>
  );
}