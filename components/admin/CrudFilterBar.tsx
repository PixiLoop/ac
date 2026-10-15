'use client';

import React from 'react';

type CrudFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;

  statusLabel?: string; // e.g. "All" / "Active" / "Inactive"
  onRefresh?: () => void;
};

export function CrudFilterBar({
  search,
  onSearchChange,
  statusLabel = 'All',
  onRefresh,
}: CrudFilterBarProps) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search chip */}
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
            <span className="text-[11px] text-slate-500">Search</span>
            <input
              className="w-40 border-0 bg-transparent text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              placeholder="Search…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Status display chip (you can hook this to a real dropdown later) */}
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-700"
          >
            Status:{' '}
            <span className="font-medium text-slate-900">
              {statusLabel}
            </span>
            <span className="text-slate-400">▼</span>
          </button>
        </div>

        {/* Right-side toolbar buttons */}
        <div className="flex items-center gap-1.5">
          {onRefresh && (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50"
              onClick={onRefresh}
              title="Refresh"
            >
              ⟳
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-[11px] text-slate-700 hover:bg-slate-50"
            title="Columns"
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  );
}
