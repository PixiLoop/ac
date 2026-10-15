'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';

export default function PwaShell({
  children,
  title = 'Field Services',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const router = useRouter();
  const { logout, user } = useAuth();

  useEffect(() => {
    let root = document.getElementById('pwa-sheet-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'pwa-sheet-root';
      document.body.appendChild(root);
    }
    setPortalEl(root);
  }, []);

  const doLogout = async () => {
    await logout();
    setOpen(false);
  };

  const navItems = [
    { key: 'jobs', label: 'Jobs', href: '/field-services', icon: '≡' },
    { key: 'list', label: 'Scheduled Jobs', href: '/field-services', icon: '📋' },
    //{ key: 'profile', label: 'Profile', href: '/profile', icon: '👤' },
  ];

  const sheet = (
    <div
      aria-hidden={!open}
      className="fixed inset-0 z-[9999] pointer-events-none"
    >
      {/* BACKDROP */}
      <div
        className={`absolute inset-0 transition-opacity ${
          open ? 'opacity-30' : 'opacity-0'
        }`}
        style={{ background: 'rgba(0,0,0,0.28)', pointerEvents: 'none' }}
      />

      {/* BOTTOM SHEET */}
      <div
        className={`absolute left-0 right-0 bottom-0 flex justify-center transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="
            relative
            w-full max-w-md mx-auto
            rounded-t-2xl bg-white shadow-xl border border-slate-200
            flex flex-col justify-center
          "
          style={{
            pointerEvents: 'auto',
            height: '80px', // REAL HEIGHT (change to 110 / 130 if needed)
          }}
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={() => setOpen(false)}
            className="
              absolute top-2 right-2
              p-2 rounded-md
              text-slate-600
              hover:bg-slate-100
            "
          >
            ✕
          </button>

          {/* ICON BUTTONS */}
          <div className="px-3 grid grid-cols-4 gap-2 text-center items-center">
            {navItems.map((it) => (
              <button
                key={it.key}
                onClick={() => {
                  setOpen(false);
                  router.push(it.href);
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                  {it.icon}
                </div>
                <p className="text-xs text-slate-600">{it.label}</p>
              </button>
            ))}

            <button
              onClick={doLogout}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                ↪
              </div>
              <p className="text-xs text-slate-600">Logout</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TOP BAR */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setOpen((s) => !s)}
            className="p-2 rounded-md hover:bg-slate-100"
          >
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
              <rect y="0" width="22" height="2" rx="1" fill="#0f172a" />
              <rect y="7" width="22" height="2" rx="1" fill="#0f172a" />
              <rect y="14" width="22" height="2" rx="1" fill="#0f172a" />
            </svg>
          </button>

          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs text-slate-400">Assigned jobs</div>
          </div>

          <button
            onClick={() => router.push('/profile')}
            className="text-sm px-3 py-1 rounded-md border border-slate-200"
          >
            {user?.displayName ?? user?.email ?? 'Me'}
          </button>
        </div>
      </header>

      {portalEl ? createPortal(sheet, portalEl) : null}

      <main className="pt-16 pb-24">
        <div className="max-w-5xl mx-auto px-4">{children}</div>
      </main>
    </div>
  );
}
