'use client';

import React, { useState } from 'react';

export function useAccountStatusGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const check = async (
    customerId?: string,
    customerStatus?: string,
    action?: string
  ): Promise<boolean> => {
    if (customerStatus === 'SUSPENDED' || customerStatus === 'ON_HOLD') {
      setErrorMessage(`Customer account is ${customerStatus}. Action cannot proceed.`);
      setIsOpen(true);
      return false;
    }
    return true;
  };

  const modal = isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-base font-bold text-slate-900 mb-2">Account Status Restricted</h3>
        <p className="text-sm text-slate-600 mb-4">{errorMessage}</p>
        <div className="flex justify-end">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { check, modal };
}
