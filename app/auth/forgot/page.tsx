'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import AuthLayout from '../../../components/layout/AuthLayout';
import Link from 'next/link';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validate = () => {
    let valid = true;
    setFormError(null);
    setEmailError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }

    return valid;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitted(false);
    setFormError(null);
    setEmailError(null);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });

      setSubmitted(true);
      showToast({
        type: 'success',
        title: 'Email sent',
        message: 'A password reset link has been sent.',
      });
    } catch (err: any) {
      const data = err?.response?.data;

      let text = 'Request failed';

      if (data?.message) {
        if (typeof data.message === 'string') {
          text = data.message;
        } else if (typeof data.message === 'object' && data.message.message) {
          text = data.message.message;
        }
      } else if (typeof err?.message === 'string') {
        text = err.message;
      }

      if (text.toLowerCase().includes('email does not exist')) {
        setEmailError('This email is not registered in our system.');
        setSubmitted(false);
      } else {
        setFormError(text);
      }

      showToast({
        type: 'error',
        title: 'Request failed',
        message: text,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
    title="Forgot password"
    subtitle="Enter your email to receive a password reset link."
    logoScale={0.75} // optional
    logoCollapsed={false}
  >

        {/* Alerts */}
        {formError && (
          <Alert type="error" title="There’s a problem">
            {formError}
          </Alert>
        )}

        {submitted && !formError && !emailError && (
          <Alert type="success" title="Email sent">
            A password reset link has been sent to your inbox.
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} noValidate className="space-y-3 mt-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              error={!!emailError}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="Email address"
            />
            {emailError && (
              <p className="mt-1 text-[10px] text-rose-600">{emailError}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-1" loading={loading}>
            Send reset link
          </Button>

          <div className="text-center text-[10px] mt-2 text-slate-500">
            Back to{' '}
            <Link href="/login" className="text-aqua hover:text-teal-500">
             Login
          </Link>
          </div>
        </form>
       </AuthLayout>
  );
}
