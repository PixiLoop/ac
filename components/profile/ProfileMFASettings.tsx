'use client';
import React from 'react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { QRCodeCanvas } from 'qrcode.react';
import { Alert } from '../../components/ui/alert';

type Props = {
  mfaEnabled: boolean;
  mfaPhase: 'idle' | 'setup';
  mfaSecret: string;
  mfaOtpUrl: string;
  mfaCode: string;
  mfaLoading?: boolean;
  mfaError?: string | null;
  beginSetup: () => Promise<void>;
  toggleMfa: (checked: boolean) => Promise<void>;
  verifyMfa: (e: React.FormEvent) => void;
  onChangeCode: (c: string) => void;
};

export default function ProfileMFASettings({
  mfaEnabled,
  mfaPhase,
  mfaSecret,
  mfaOtpUrl,
  mfaCode,
  mfaLoading,
  mfaError,
  beginSetup,
  toggleMfa,
  verifyMfa,
  onChangeCode,
}: Props) {
  return (
    <div className="space-y-3">
      {mfaError && <Alert type="error">{mfaError}</Alert>}

      <div className="flex items-center justify-between">
        <div className="space-y-1 text-[11px] text-slate-600">
          <div className="font-medium text-slate-700">Enable 2FA</div>
          <p>Use an authenticator app for an extra layer of security.</p>
          <p>Status: <span className="font-semibold">{mfaEnabled ? 'Enabled' : 'Not enabled'}</span></p>
        </div>

        <button
          type="button"
          aria-label="Toggle 2FA"
          disabled={mfaLoading}
          onClick={() => toggleMfa(!mfaEnabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full border transition ${mfaEnabled || mfaPhase === 'setup' ? 'bg-aqua border-aqua' : 'bg-slate-200 border-slate-300'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${mfaEnabled || mfaPhase === 'setup' ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>

      {mfaPhase === 'idle' && <p className="text-[10px] text-slate-500">Click the toggle to start 2FA setup. You’ll scan a QR code with your authenticator app.</p>}

      {mfaPhase === 'setup' && (
        <form onSubmit={verifyMfa} className="space-y-3">
          <div className="text-[11px] text-slate-600 space-y-2">
            <p>Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="flex justify-center py-2">
              {mfaOtpUrl && <QRCodeCanvas value={mfaOtpUrl} size={160} />}
            </div>
            {mfaSecret && <p className="text-center">Or enter this key manually: <span className="font-mono font-semibold">{mfaSecret}</span></p>}
          </div>

          <div className="space-y-1">
            <Label>6-digit code</Label>
            <Input value={mfaCode} onChange={(e) => onChangeCode(e.target.value)} maxLength={6} placeholder="123456" />
            <p className="mt-1 text-[10px] text-slate-500">Codes change every 30 seconds. Enter the latest code shown.</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => toggleMfa(false)} disabled={mfaLoading}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" loading={mfaLoading}>Verify &amp; enable</Button>
          </div>
        </form>
      )}
    </div>
  );
}
