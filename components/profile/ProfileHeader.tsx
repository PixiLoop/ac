'use client';
import React from 'react';
import { Button } from '../../components/ui/button';

type Props = {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  editing: boolean;
  saving?: boolean;
  onEditStart: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function ProfileHeader({
  fullName,
  email,
  avatarUrl,
  editing,
  saving,
  onEditStart,
  onCancel,
  onSave,
}: Props) {
  return (
    <div className="flex items-start gap-4">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-ink text-white flex items-center justify-center text-[18px] font-semibold overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="uppercase">{(fullName || email || 'U').charAt(0)}</span>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] font-semibold text-slate-900">{fullName}</div>
            <div className="text-[11px] text-slate-500">{email}</div>
          </div>

          <div className="flex gap-2">
            {!editing ? (
              <Button size="sm" variant="ghost" onClick={onEditStart}>Edit</Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-600">
          <div>Status: <span className="font-semibold text-emerald-700">Active</span></div>
          <div className="mt-1 text-[10px] text-slate-500">Tip: update display name to control how your name appears across the app.</div>
        </div>
      </div>
    </div>
  );
}
