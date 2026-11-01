'use client';

import { useCallback, useRef, useState } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { AccountContext, accountStatusGate } from '../lib/account-status';

type Prompt = {
  message: string;
  block: boolean;
  resolve: (ok: boolean) => void;
};

export function useAccountStatusGate() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const acknowledged = useRef(new Set<string>());

  const check = useCallback((
    customerId: string | null | undefined,
    status: string | null | undefined,
    context: AccountContext,
  ) => {
    const result = accountStatusGate(status, context);
    if (result.gate === 'allow' || !customerId) return Promise.resolve(true);

    const key = `${context}:${customerId}:${result.gate}:${result.message}`;
    if (result.gate === 'warn' && acknowledged.current.has(key)) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      setPrompt({
        message: result.message,
        block: result.gate === 'block',
        resolve: (ok) => {
          if (ok) acknowledged.current.add(key);
          resolve(ok);
        },
      });
    });
  }, []);

  const close = (ok: boolean) => {
    const current = prompt;
    setPrompt(null);
    current?.resolve(ok);
  };

  const modal = (
    <ConfirmModal
      open={!!prompt}
      title=""
      message={prompt?.message ?? ''}
      confirmText="OK"
      alertOnly
      danger={prompt?.block ?? false}
      onConfirm={() => close(!(prompt?.block))}
      onCancel={() => close(false)}
    />
  );

  return { check, modal };
}
