'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';
import AuthLayout from '../../../components/layout/AuthLayout';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { useToast } from '../../../components/ui/toast';
import { PasswordInput } from '../../../components/ui/PasswordInput';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const token = params.get('token');

  const [status, setStatus] =
    useState<'checking' | 'valid' | 'invalid'>('checking');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    api
      .get(`/auth/validate-reset-token?token=${token}`)
      .then((res) =>
        setStatus(res.data?.data?.valid ? 'valid' : 'invalid'),
      )
      .catch(() => setStatus('invalid'));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirm) {
      showToast({
        type: 'error',
        title: 'Reset failed',
        message: 'All fields are required.',
      });
      return;
    }

    if (password.length < 8) {
      showToast({
        type: 'error',
        title: 'Reset failed',
        message: 'Password must be at least 8 characters.',
      });
      return;
    }

    if (password !== confirm) {
      showToast({
        type: 'error',
        title: 'Reset failed',
        message: 'Passwords do not match.',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });

      showToast({
        type: 'success',
        title: 'Password changed',
        message: 'You can now log in with your new password.',
      });

      router.push('/login');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Reset failed',
        message:
          err?.response?.data?.message ?? 'Could not reset password.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={
        status === 'checking'
          ? 'Checking link…'
          : status === 'invalid'
          ? 'Invalid or expired link'
          : 'Reset your password'
      }
      subtitle={
        status === 'checking'
          ? 'Please wait'
          : status === 'invalid'
          ? 'This reset link is no longer valid.'
          : 'Choose a new password.'
      }
    >
      {status === 'checking' && (
        <div className="p-10 text-center text-sm">Checking link…</div>
      )}

      {status === 'invalid' && (
        <>
          <Alert type="error" title="Reset link expired">
            This reset link has already been used or expired.
          </Alert>

          <Button
            className="w-full mt-4"
            onClick={() => router.push('/auth/forgot')}
          >
            Request new reset link
          </Button>
        </>
      )}

      {status === 'valid' && (
        <form className="space-y-3 mt-3" onSubmit={submit}>
          <div className="space-y-1">
            <Label>New password</Label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Enter new password"
              showRules={true}
            />
          </div>

          <div className="space-y-1">
            <Label>Confirm password</Label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              placeholder="Re-enter password"
            />
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Reset password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
