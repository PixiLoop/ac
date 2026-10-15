'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-xl shadow-lg p-8">
        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <Image
            src="/Logo2.png" 
            alt="AIRCO"
            width={120}
            height={40}
            priority
          />
        </div>

        {/* ICON */}
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-4xl">
            🚧
          </div>
        </div>

        {/* TEXT */}
        <h1 className="text-3xl font-bold text-slate-800 mb-2">404</h1>
        <p className="text-slate-600 mb-6">
          Sorry, the page you’re looking for doesn’t exist or was moved.
        </p>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Go back
          </button>

          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
