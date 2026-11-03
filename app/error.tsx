'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong!</h2>
        <p className="text-sm text-slate-600 mb-6">An unexpected error has occurred.</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
