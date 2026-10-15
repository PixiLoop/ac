'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './label';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
};

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 250,
  readOnly,
}: Props) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>

      <textarea
        className={cn(
          'w-full rounded-md border border-slate-200 px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500',
          'min-h-[100px]',
          readOnly && 'bg-slate-50 text-slate-500'
        )}
        rows={8}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="flex justify-end text-xs text-slate-400">
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
