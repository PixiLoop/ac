'use client';

import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  className,
  variant = 'primary',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-aqua disabled:opacity-60 disabled:cursor-not-allowed';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-white hover:bg-[#101c36]',
    accent: 'border border-aqua bg-aqua/5 text-[#00585a] hover:bg-aqua/10',
    ghost: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  };

  return (
    <button
      className={clsx(base, variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-2 h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
      )}
      {children}
    </button>
  );
}
