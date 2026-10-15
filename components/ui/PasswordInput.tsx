'use client';

import React, { useState } from 'react';
import { Input } from './input';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { PasswordRules } from './PasswordRules';

type Props = {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  autoComplete?: string;
  showRules?: boolean;
  disabled?: boolean;
  placeholder?: string;
  isLeftIcon?: boolean;
};

export function PasswordInput({
  value,
  onChange,
  error,
  autoComplete = 'new-password',
  showRules = false,
  disabled = false,
  placeholder,
  isLeftIcon = false
}: Props) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        error={error}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        leftIcon={isLeftIcon? (<Lock size={16} /> ) : null}
        rightIcon={
          !disabled && (
            <button type="button" onClick={() => setShow(v => !v)}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )
        }
        placeholder={placeholder}
      />

      <PasswordRules password={value} show={showRules} />
    </div>
  );
}
