'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api-client';

export type MainAccountOption = {
  id: string;
  customerNumber: string;
  name: string;
  registeredName?: string | null;
};

type Props = {
  value: MainAccountOption | null;
  onSelect: (account: MainAccountOption | null) => void;
  excludeId?: string;
  disabled?: boolean;
};

export function MainAccountSelect({
  value,
  onSelect,
  excludeId,
  disabled,
}: Props) {
  const [accounts, setAccounts] = useState<MainAccountOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/customers', {
        params: {
          search: query.trim() || undefined,
          accountType: 'Main',
          take: 50,
          sortKey: 'name',
          sortDir: 'asc',
        },
      }).then(res => {
        const data = res.data?.data?.data || res.data?.data || res.data;
        const rows = Array.isArray(data) ? data : [];
        setAccounts(
          rows.filter(
            (row: MainAccountOption & { accountType?: string | null }) =>
              row.id !== excludeId && /^main$/i.test(row.accountType ?? ''),
          ),
        );
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query, excludeId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => setHighlighted(0), [query, accounts.length]);

  const labelFor = (account: MainAccountOption) =>
    `${account.customerNumber} – ${account.name}`;

  const accept = (account: MainAccountOption) => {
    onSelect(account);
    setOpen(false);
    setQuery('');
  };

  if (disabled) {
    return (
      <div className="w-full min-w-0">
        <label className="font-medium text-slate-700 mb-1 block text-sm">
          Main Account
        </label>
        <div className="w-full h-10 border rounded-md px-3 flex items-center text-sm bg-slate-50 text-slate-700 truncate">
          {value ? labelFor(value) : '-'}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <label className="font-medium text-slate-700 mb-1 block text-sm">
        Main Account
      </label>
      <div
        className={cn(
          'w-full h-10 border border-slate-300 rounded-md px-3 flex items-center text-sm bg-white cursor-pointer truncate',
          !value && 'text-slate-400',
        )}
        onClick={() => setOpen(o => !o)}
      >
        {value ? labelFor(value) : 'Select Main Account'}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full border rounded-md bg-white shadow-lg">
          <input
            autoFocus
            className="w-full px-3 py-2 text-sm border-b outline-none"
            placeholder="Type to search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlighted(h => Math.min(h + 1, accounts.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlighted(h => Math.max(h - 1, 0));
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                const selected = accounts[highlighted];
                if (selected) accept(selected);
              }
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <div className="max-h-56 overflow-auto">
            {accounts.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No main accounts</div>
            )}
            {accounts.map((account, idx) => (
              <div
                key={account.id}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer',
                  idx === highlighted && 'bg-slate-100',
                )}
                onMouseEnter={() => setHighlighted(idx)}
                onClick={() => accept(account)}
              >
                <span className="font-mono text-xs text-slate-500 mr-2">
                  {account.customerNumber}
                </span>
                {account.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
