'use client';

import React from 'react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useToast } from '../../components/ui/toast';
import { useFormValidation } from '../../lib/use-form-validation';
import {
  isRequired,
  isStrongPassword,
} from '../../lib/validators';

/* ================= TYPES ================= */

type Fields =
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword'
  | 'secretQuestion'
  | 'secretAnswer';

type Props = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  secretQuestion: string;
  secretAnswer: string;
  loading?: boolean;

  onChangeCurrent: (v: string) => void;
  onChangeNew: (v: string) => void;
  onChangeConfirm: (v: string) => void;
  onChangeSecretQuestion: (v: string) => void;
  onChangeSecretAnswer: (v: string) => void;
  onSubmit: () => Promise<void>;
};

/* ================= COMPONENT ================= */

export default function ProfileChangePassword({
  currentPassword,
  newPassword,
  confirmPassword,
  secretQuestion,
  secretAnswer,
  loading,
  onChangeCurrent,
  onChangeNew,
  onChangeConfirm,
  onChangeSecretQuestion,
  onChangeSecretAnswer,
  onSubmit,
}: Props) {
  const { showToast } = useToast();
  const { invalidate, clear, has } = useFormValidation<Fields>();

  /* ---------- SUBMIT ---------- */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error =
      invalidate({
        ...(isRequired(currentPassword)
          ? {}
          : { currentPassword: 'Current password is required' }),

        ...(isStrongPassword(newPassword)
          ? {}
          : {
              newPassword:
                'New password must be 8+ chars and include upper, lower & number',
            }),

        ...(confirmPassword === newPassword
          ? {}
          : { confirmPassword: 'Passwords do not match' }),

        ...(isRequired(secretQuestion)
          ? {}
          : { secretQuestion: 'Secret question is required' }),

        ...(isRequired(secretAnswer)
          ? {}
          : { secretAnswer: 'Secret answer is required' }),
      }) || null;

    if (error) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: error,
      });
      return;
    }

    await onSubmit();
  };

  /* ================= RENDER ================= */

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Current password *</Label>
        <PasswordInput
          value={currentPassword}
          error={has('currentPassword')}
          autoComplete="current-password"
          onChange={v => {
            onChangeCurrent(v);
            clear('currentPassword');
          }}
        />
      </div>

      <div>
        <Label>New password *</Label>
        <PasswordInput
          value={newPassword}
          error={has('newPassword')}
          showRules
          onChange={v => {
            onChangeNew(v);
            clear('newPassword');
          }}
        />
      </div>

      <div>
        <Label>Confirm new password *</Label>
        <PasswordInput
          value={confirmPassword}
          error={has('confirmPassword')}
          onChange={v => {
            onChangeConfirm(v);
            clear('confirmPassword');
          }}
        />
      </div>

      <div>
        <Label>Secret question *</Label>
        <Input
          value={secretQuestion}
          error={has('secretQuestion')}
          onChange={e => {
            onChangeSecretQuestion(e.target.value);
            clear('secretQuestion');
          }}
        />
      </div>

      <div>
        <Label>Secret answer *</Label>
        <PasswordInput
          value={secretAnswer}
          error={has('secretAnswer')}
          onChange={v => {
            onChangeSecretAnswer(v);
            clear('secretAnswer');
          }}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        loading={loading}
      >
        Save and continue
      </Button>
    </form>
  );
}
