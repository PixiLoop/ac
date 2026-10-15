'use client';

import React from 'react';
import clsx from 'clsx';

type AlertProps = {
  type?: 'error' | 'success' | 'info';
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

export function Alert({
  type = 'info',
  title,
  children,
  className,
}: AlertProps) {
  const styles: Record<string, string> = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <div
      className={clsx(
        'mb-4 flex gap-2 rounded-md border px-3 py-2 text-[11px]',
        styles[type],
        className,
      )}
    >
      <div className="mt-0.5">
        {type === 'error' && '⚠️'}
        {type === 'success' && '✔️'}
        {type === 'info' && 'ℹ️'}
      </div>
      <div>
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  );
}
