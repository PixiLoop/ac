'use client';

import React, { ReactNode } from 'react';
import { Button } from '../ui/button';

type CrudCardTableProps = {
  children: ReactNode; // <thead> + <tbody>
  total: number;
  skip: number;
  take: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function CrudCardTable({
  children,
  total,
  skip,
  take,
  page,
  totalPages,
  onPageChange,
}: CrudCardTableProps) {
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + take, total);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          {children}
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">
          <span>
            Showing{' '}
            <span className="text-slate-800">{from}</span> to{' '}
            <span className="text-slate-800">{to}</span> of{' '}
            <span className="text-slate-800">{total}</span> records
          </span>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[10px]">
              <button className="rounded-full bg-white px-2 py-0.5 text-slate-800 border border-slate-200">
                Default
              </button>
              <button className="rounded-full px-2 py-0.5 text-slate-500">
                Compact
              </button>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1 py-0.5">
              <button
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                ‹
              </button>
              <button className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-[10px] text-slate-800">
                {page}
              </button>
              <button
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
