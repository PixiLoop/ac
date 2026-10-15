'use client';

import { Check, X } from 'lucide-react';
import { validatePassword } from './password-rules';
import { cn } from '../../lib/utils';

type Props = {
  password: string;
  show: boolean; // 🔑 controls visibility
};

export function PasswordRules({ password, show }: Props) {
  if (!show) return null;

  const rules = validatePassword(password);

  const Item = ({
    ok,
    label,
  }: {
    ok: boolean;
    label: string;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <X className="h-4 w-4 text-rose-600" />
      )}
      <span
        className={cn(
          ok ? 'text-emerald-700' : 'text-slate-600'
        )}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
      <p className="text-xs font-medium text-slate-700 mb-1">
        Password must contain:
      </p>

      <Item ok={rules.minLength} label="At least 8 characters long" />
      <Item ok={rules.uppercase} label="Contains uppercase letter (A–Z)" />
      <Item ok={rules.lowercase} label="Contains lowercase letter (a–z)" />
      <Item ok={rules.number} label="Contains number (0–9)" />
    </div>
  );
}
