'use client';
import React from 'react';

type Props = {
  activeTab: 'password' | 'mfa';
  onChangeTab: (t: 'password' | 'mfa') => void;
};

export default function ProfileSecurityTabs({ activeTab, onChangeTab }: Props) {
  return (
    <div className="inline-flex rounded-lg bg-slate-50 p-[2px] text-[11px]">
      <button type="button" onClick={() => onChangeTab('password')} className={`px-3 py-1 rounded-md ${activeTab === 'password' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>Change password</button>
      <button type="button" onClick={() => onChangeTab('mfa')} className={`px-3 py-1 rounded-md ${activeTab === 'mfa' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>Two-factor (2FA)</button>
    </div>
  );
}
