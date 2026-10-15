'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export function FormSection({
  title,
  required,
  completed,
  disabled,
  rightAction,
  defaultOpen = false,
  children,
}: {
  title: string;
  required?: boolean;
  completed?: boolean;
  disabled?: boolean;
  rightAction?: React.ReactNode;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="rounded-lg border bg-white mb-3">
      {/* HEADER */}
      <div
        className={clsx(
          'flex items-center justify-between',
          'px-3 py-2',
          !disabled && 'cursor-pointer',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        onClick={() => {
          if (!disabled) setOpen(o => !o);
        }}
      >
        {/* LEFT */}
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-800">
            {title}
            {required && (
              <span className="ml-1 text-rose-500">*</span>
            )}
          </h3>

          {completed && (
            <span className="text-xs text-emerald-600">
              Saved
            </span>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          {/* ACTION (Add Item etc) */}
          {open && rightAction && (
            <div
              onClick={e => {
                e.stopPropagation(); // 🔑 prevent collapse
              }}
            >
              {rightAction}
            </div>
          )}

          <ChevronDown
            className={clsx(
              'h-4 w-4 transition-transform text-slate-500',
              open && 'rotate-180',
            )}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div
        className={clsx(
          'px-3 py-3 border-t transition-all',
          !open && 'hidden',
        )}
      >
        {!disabled && children}
      </div>
    </div>
  );
}
