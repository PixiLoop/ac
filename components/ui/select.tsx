'use client';

import React from 'react';
import clsx from 'clsx';

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function Select({
  label,
  placeholder = 'Select option',
  value = '',
  options,
  onChange,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className={clsx('', className)}>
      {label && (
        <label className="font-medium text-slate-700">
          {label}
        </label>
      )}

      <select
        className={clsx(
          'w-full rounded-md border border-slate-300 h-10 px-3 text-sm leading-10',
          'focus:outline-none focus:ring-2 focus:ring-brand-blue',
          disabled && 'bg-slate-100 cursor-not-allowed'
        )}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
      >
        <option value="">
          {placeholder}
        </option>

        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
