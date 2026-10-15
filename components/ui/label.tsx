'use client';

import React from 'react';
import clsx from 'clsx';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={clsx(
        'block text-[11px] font-medium text-slate-700 mb-1',
        className,
      )}
      {...props}
    />
  );
}
