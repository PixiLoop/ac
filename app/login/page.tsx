'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useToast } from '../../components/ui/toast';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../providers/auth-provider';
import { mutate as globalMutate } from 'swr';
import { Mail } from 'lucide-react';
import { PasswordInput } from '../../components/ui/PasswordInput';
import Link from 'next/link';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const auth = useAuth();

  const [phase, setPhase] = useState<'login' | 'mfa'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setEmail('nagarjunae@cygen.au');
      setPassword('Admin@Admin1');
    }
  }, []);

  /* ---------- VALIDATION ---------- */
  const validateLogin = () => {
    let ok = true;
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Email is required.');
      ok = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      ok = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      ok = false;
    }

    if (!ok) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Please fix the highlighted fields and try again.',
      });
    }

    return ok;
  };

  /* ---------- AUTH SYNC ---------- */
  const redirectAfterTokens = async () => {
    try {
      const meRes = await api.get('/auth/me');
      const fetched = meRes.data?.data ?? meRes.data;
      const cachePayload =
        fetched && typeof fetched === 'object' && 'user' in fetched
          ? fetched
          : { user: fetched };

      await globalMutate('/auth/me', cachePayload, false);

      const user = cachePayload.user;
      router.push(user?.mustChangePassword ? '/profile' : '/profile');
    } catch {
      router.push('/profile');
    }
  };

  /* ---------- LOGIN ---------- */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const data = res.data?.data ?? res.data;

      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setPhase('mfa');
        setMfaCode('');
        setMfaError(null);

        showToast({
          type: 'info',
          title: 'MFA required',
          message: 'Enter the 6-digit code from your authenticator app.',
        });
        return;
      }

      await auth.login(email.trim(), password);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Login failed. Please check your credentials.';

      setError(msg);
      showToast({
        type: 'error',
        title: 'Login failed',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- MFA ---------- */
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mfaToken || !mfaCode.trim()) {
      setMfaError('Please enter the MFA code.');
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Authentication code is required.',
      });
      return;
    }

    setLoading(true);
    setMfaError(null);

    try {
      const res = await api.post('/auth/mfa/login', {
        mfaToken,
        code: mfaCode.trim(),
      });

      const data = res.data?.data ?? res.data;
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      showToast({
        type: 'success',
        title: 'MFA successful',
        message: 'You are now signed in.',
      });

      await redirectAfterTokens();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.message?.message === 'string'
          ? data.message.message
          : 'Invalid MFA code. Please try again.';

      setMfaError(msg);
      showToast({
        type: 'error',
        title: 'MFA failed',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const showLoginForm = phase === 'login';

  return (
    <AuthLayout
      title={showLoginForm ? 'Sign in to AIRCO AIMS' : 'Multi-factor authentication'}
      subtitle={
        showLoginForm
          ? 'Enter your email and password to continue.'
          : 'Enter the 6-digit code from your authenticator app.'
      }
    >
      {showLoginForm ? (
        <>
          {error && <Alert type="error">{error}</Alert>}

          <form noValidate className="space-y-3 mt-3" onSubmit={handleLoginSubmit}>
            <div className="space-y-1">
              <Label>Email address</Label>
              <Input
                value={email}
                error={!!emailError}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                leftIcon={<Mail size={16} />}
                placeholder="Enter your email address"
              />
              {emailError && (
                <p className="text-[10px] text-rose-600">{emailError}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Password</Label>
              <PasswordInput
                isLeftIcon
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (passwordError) setPasswordError(null);
                }}
                error={!!passwordError}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              {passwordError && (
                <p className="text-[10px] text-rose-600">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <input id="remember" type="checkbox" className="h-3 w-3 rounded border-slate-300" />
                <label htmlFor="remember">Keep me signed in</label>
              </div>
              <Link href="/auth/forgot" className="text-aqua">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </>
      ) : (
        <>
          {mfaError && <Alert type="error">{mfaError}</Alert>}

          <form noValidate className="space-y-3 mt-3" onSubmit={handleMfaSubmit}>
            <div className="space-y-1">
              <Label>Authentication code</Label>
              <Input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Verify & continue
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
