'use client';

import React, { useEffect, useState } from 'react';
import { Input } from './input';
import { cn } from '../../lib/utils';

type Props = {
  value: string;
  onChange: (v: string) => void;

  required?: boolean;
  maxLength?: number;        // default 11
  minLength?: number;        // default 7
  disabled?: boolean;

  placeholder?: string;
  showMask?: boolean;        // UI only (XXX-XXX-XXXX)
  countryCode?: string;      // "+91", "+44" (display only)

  error?: string | null;
  onErrorChange?: (err: string | null) => void;
};

export function PhoneInput({
  value,
  onChange,
  required = false,
  maxLength = 11,
  minLength = 7,
  disabled,
  placeholder = 'Phone number',
  showMask = false,
  countryCode,
  error,
  onErrorChange,
}: Props) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const sanitize = (v: string) =>
    v.replace(/\D/g, '').slice(0, maxLength);

  const validate = (v: string): string | null => {
    if (required && !v) return 'Phone number is required';
    if (v && v.length < minLength) return 'Phone number is too short';
    if (v && v.length > maxLength) return 'Phone number is too long';
    return null;
  };

  const handleChange = (raw: string) => {
    const cleaned = sanitize(raw);
    onChange(cleaned);

    const err = validate(cleaned);
    setInternalError(err);
    onErrorChange?.(err);
  };

  const formatMasked = (v: string) => {
    if (!showMask) return v;
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}-${v.slice(3)}`;
    return `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}`;
  };

  useEffect(() => {
    const err = validate(value);
    setInternalError(err);
    onErrorChange?.(err);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="">
      {countryCode && (
        <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm flex items-center text-slate-600">
          {countryCode}
        </div>
      )}

      <Input
        disabled={disabled}
        inputMode="numeric"
        placeholder={placeholder}
        value={focused ? value : value} //formatMasked(value)
        onFocus={() => setFocused(true)}
        onBlur={() => {
            setFocused(false);

            const err = validate(value);
            setInternalError(err);
            onErrorChange?.(err);
        }}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
             'flex-1',
          internalError && 'border-rose-400 focus:ring-rose-500'
        )}
      />
    </div>
  );
}
