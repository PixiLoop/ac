'use client';

import React from 'react';
import Logo from '../common/Logo';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  logoScale?: number;
  logoCollapsed?: boolean;
  containerClassName?: string;
};

export default function AuthLayout({
  title,
  subtitle,
  children,
  logoScale = 1,
  logoCollapsed = false,
  containerClassName = '',
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-3 sm:px-6">
      <div className={`w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6 ${containerClassName}`}>
        {/* Logo */}
        <div className="flex items-center justify-center mb-4">
          <Logo collapsed={logoCollapsed} scale={logoScale} />
        </div>

        {/* Heading + subtitle */}
        <div className="space-y-1 text-center mb-4">
          <h1 className="text-[16px] font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>

        {/* main content (form / messages) */}
        <div>{children}</div>
      </div>
    </div>
  );
}
