'use client';

import * as React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '../../lib/utils';

export interface DatePickerProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: boolean;

  value?: string | null;
  onChange?: (value: string | null) => void;

  disabled?: boolean;
  onlyFuture?: boolean;
  onlyPast?: boolean;

  placeholder?: string;
  className?: string;
}

export function DatePicker({
  label,
  required,
  hint,
  error,
  value,
  onChange,
  disabled,
  onlyFuture,
  onlyPast,
  placeholder,
  className,
}: DatePickerProps) {
  const today = new Date();

  const selectedDate = value ? new Date(value) : null;

  return (
    <div className="space-y-1">
      {label && (
        <label className="font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-1 text-rose-600">*</span>
          )}
        </label>
      )}

      <ReactDatePicker
        selected={selectedDate}
        onChange={(date: Date | null) =>
          onChange?.(
            date ? date.toISOString().split('T')[0] : null
          )
        }
        minDate={onlyFuture ? today : undefined}
        maxDate={onlyPast ? today : undefined}
        dateFormat="dd-MM-yyyy"
        disabled={disabled}
        placeholderText={placeholder}
        popperPlacement="bottom-start"
        popperClassName="z-50"
        className={cn(
          'flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition',
          error
            ? 'border-rose-500 focus-visible:ring-rose-500'
            : 'border-slate-300 focus-visible:ring-aqua',
          'focus-visible:outline-none focus-visible:ring-2',
          className,
        )}
      />

      {hint && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}