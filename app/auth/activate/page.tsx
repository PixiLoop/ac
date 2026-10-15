'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthLayout from '../../../components/layout/AuthLayout';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { api } from '../../../lib/api-client';

export default function ActivatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    api
      .get(`/auth/activate?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthLayout
      title={
        status === 'success'
          ? 'Account activated'
          : status === 'error'
          ? 'Activation failed'
          : 'Activating account'
      }
      subtitle={
        status === 'success'
          ? 'Your account has been successfully activated.'
          : status === 'error'
          ? 'This activation link is invalid or has expired.'
          : 'Please wait while we activate your account.'
      }
      logoScale={0.75}
      logoCollapsed={false}
    >
      {/* Loading */}
      {status === 'loading' && (
        <Alert type="info" title="Activating">
          Please wait while we activate your account…
        </Alert>
      )}

      {/* Success */}
      {status === 'success' && (
        <>
          <Alert type="success" title="Success">
            Your AIRCO AIMS account is now active. You can sign in using the
            credentials sent to your email.
          </Alert>

          <Button
            className="w-full mt-3"
            onClick={() => router.push('/login')}
          >
            Go to Login
          </Button>
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <>
          <Alert type="error" title="Activation failed">
            The activation link is invalid or has expired. Please contact your
            administrator or request a new activation email.
          </Alert>

          <Button
            variant="secondary"
            className="w-full mt-3"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </Button>
        </>
      )}
    </AuthLayout>
  );
}
