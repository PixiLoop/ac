'use client';

import { cn } from '../../lib/utils';

/** Custom radio — avoids global `input`/`label` CSS that stretches native radios. */
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
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={cn(
        'flex w-full items-center gap-2 text-left text-sm text-slate-700',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        margin: 0,
        padding: '2px 0',
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          minWidth: 14,
          borderRadius: '50%',
          border: checked ? '4px solid #00b0b3' : '2px solid #94a3b8',
          background: '#fff',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 14, lineHeight: '20px', color: '#334155' }}>{label}</span>
    </button>
  );
}
