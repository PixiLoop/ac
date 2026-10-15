'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

type SanitizeType = 'name' | 'none';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  hint?: string;

  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  sanitizeType?: SanitizeType;
  sanitize?: (value: string) => string;

  numeric?: boolean;
  decimal?: boolean;
  maxDigits?: number;
  maxDecimals?: number;
}

/* ---------- BUILT-IN SANITIZERS ---------- */
const sanitizeByType = (value: string, type?: SanitizeType) => {
  if (!type || type === 'none') return value;

  switch (type) {
    case 'name':
      return value
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trimStart();
    default:
      return value;
  }
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      required,
      hint,
      error,
      leftIcon,
      rightIcon,
      sanitizeType = 'none',
      sanitize,
      onChange,
      placeholder,
      numeric,
      decimal,
      maxDigits,
      maxDecimals,
      ...props
    },
    ref,
  ) => {
    const localRef = React.useRef<HTMLInputElement | null>(null);
    const cursorRef = React.useRef<number | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        localRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref],
    );

    React.useLayoutEffect(() => {
      if (cursorRef.current !== null && localRef.current) {
        // Only run selection range on supported input types
        const supportsSelection = ['text', 'search', 'url', 'tel', 'password'].includes(
          localRef.current.type
        );

        if (supportsSelection) {
          try {
            localRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
          } catch {
            // Ignore error if element currently does not support selection
          }
        }
        cursorRef.current = null;
      }
    });

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

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}

          {rightIcon && (
            <div className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}

          <input
            ref={setRefs}
            type={type}
            placeholder={placeholder}
            {...props}
            className={cn(
              'flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error
                ? 'border-rose-500 focus-visible:ring-rose-500'
                : 'border-slate-300 focus-visible:ring-aqua',
              'focus-visible:outline-none focus-visible:ring-2',
              className,
            )}
            onChange={(e) => {
              const rawValue = e.target.value;
              const selectionStart = e.target.selectionStart ?? rawValue.length;
              let value = rawValue;

              /* Numeric Only */
              if (numeric) {
                value = value.replace(/\D/g, '');
                if (maxDigits) {
                  value = value.slice(0, maxDigits);
                }
              }

              /* Decimal Support */
              if (decimal) {
                value = value.replace(/[^0-9.]/g, '');

                // Only allow one dot
                const parts = value.split('.');
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts[1];
                }

                let [intPart, decPart] = value.split('.');

                if (maxDigits) {
                  intPart = intPart.slice(0, maxDigits);
                }

                if (maxDecimals !== undefined && decPart !== undefined) {
                  decPart = decPart.slice(0, maxDecimals);
                }

                value =
                  decPart !== undefined ? `${intPart}.${decPart}` : intPart;
              }

              /* Existing sanitizers */
              value = sanitizeByType(value, sanitizeType);
              if (sanitize) value = sanitize(value);

              // Preserve cursor position across re-format
              const delta = value.length - rawValue.length;
              cursorRef.current = Math.max(0, selectionStart + delta);

              if (value !== e.target.value) {
                e.target.value = value;
              }

              onChange?.(e);
            }}
          />
        </div>

        {hint && (
          <p className="text-xs text-slate-500">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export { Input };