'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import clsx from 'clsx';

/* ================= TYPES ================= */

type ToastType = 'success' | 'error' | 'info';

type ToastMessage = string | string[] | Record<string, any>;

type Toast = {
  id: number;
  type: ToastType;
  title?: string;
  message?: ToastMessage;
};

type ToastContextType = {
  showToast: (opts: {
    type?: ToastType;
    title?: string;
    message?: ToastMessage;
  }) => void;
};
/* ================= CONTEXT ================= */

const ToastContext = createContext<ToastContextType | null>(null);

/* ================= CLOSE ICON ================= */

const CloseIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ================= PROVIDER ================= */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const showToast = useCallback(
    ({
      type = 'info',
      title,
      message,
    }: {
      type?: ToastType;
      title?: string;
      message?: ToastMessage;
    }) => {
      const id = ++idRef.current;

      setToasts((prev) => [...prev, { id, type, title, message }]);

      // auto close after 4s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  // const showToast = useCallback(
  //   ({
  //     type = 'info',
  //     title,
  //     message,
  //   }: {
  //     type?: ToastType;
  //     title?: string;
  //     message?: string;
  //   }) => {
  //     //const id = Date.now();
  //     const id = ++idRef.current;


  //     setToasts((prev) => [...prev, { id, type, title, message }]);

  //     // auto close after 4s
  //     setTimeout(() => {
  //       setToasts((prev) => prev.filter((t) => t.id !== id));
  //     }, 4000);
  //   },
  //   [],
  // );

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* TOAST CONTAINER */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'relative w-72 rounded-md border px-3 py-2 shadow-lg text-xs animate-[toast-in_0.18s_ease-out]',
              toast.type === 'success' &&
              'border-emerald-200 bg-emerald-50 text-emerald-900',
              toast.type === 'error' &&
              'border-rose-200 bg-rose-50 text-rose-900',
              toast.type === 'info' &&
              'border-slate-200 bg-white text-slate-900',
            )}
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              aria-label="Close"
            >
              <CloseIcon />
            </button>

            {toast.title != null && (
              <div className="font-semibold mb-0.5">
                {typeof toast.title === 'string'
                  ? toast.title
                  : JSON.stringify(toast.title)}
              </div>
            )}
            <div>
              {typeof toast.message === 'string'
                ? toast.message
                : Array.isArray(toast.message)
                  ? toast.message.join(', ')
                  : toast.message != null
                    ? JSON.stringify(toast.message)
                    : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
