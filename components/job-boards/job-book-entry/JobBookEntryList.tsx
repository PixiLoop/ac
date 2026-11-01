'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { jobBookEntryApi } from '../../../lib/job-book-entry-client';
import { useToast } from '../../ui/toast';
import type { JobBookEntry } from './types';

function fmtDateYmd(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    return '—';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDateOut(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function detailsPreview(row: JobBookEntry) {
  const raw = String(row.itemDetails || '').trim();
  if (raw) return raw.split('\n')[0].slice(0, 48);
  const svc = String(row.serviceDetails || '');
  const m = svc.match(/Item Details:\s*(.+)/i);
  if (m?.[1]?.trim()) return m[1].trim().slice(0, 48);
  return '—';
}

export function JobBookEntryList() {
  const router = useRouter();
  const { showToast } = useToast();
  const [rows, setRows] = useState<JobBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async (q = search) => {
    setLoading(true);
    try {
      const res = await jobBookEntryApi.list(q);
      const payload: any = res.data;
      const list: JobBookEntry[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setRows(list);
      if (res.error) {
        showToast({
          type: 'error',
          title: res.error?.message || 'Failed to load entries — run prisma migrate deploy',
          replace: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHint = useMemo(
    () => `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`,
    [rows.length],
  );

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete job book entry ${label}?`)) return;
    setDeletingId(id);
    try {
      const res = await jobBookEntryApi.remove(id);
      if (res.error) {
        showToast({
          type: 'error',
          title: res.error?.message || 'Could not delete entry',
          replace: true,
        });
        return;
      }
      showToast({ type: 'success', title: 'Entry deleted', replace: true });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const colCount = 14;

  return (
    <div className="space-y-3 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Job Book Entry</h1>
          <p className="text-xs text-slate-500">
            Legacy-style job book records — list previous entries, then create or edit.
          </p>
        </div>
        <Link
          href="/job-boards/job-book-entry/new"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-ink text-white text-xs font-semibold hover:bg-[#101c36] shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Job Entry
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(search);
            }}
            placeholder="Search job #, customer, order, details…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>
        <button
          type="button"
          onClick={() => void load(search)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Search
        </button>
        <span className="text-[11px] text-slate-500 ml-auto">{filteredHint}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-hover-thin">
          <table className="w-full text-left text-[11px] min-w-[1280px] border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Job Num</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Date</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Acc</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Cus</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Order</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200 min-w-[140px]">Details</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200 min-w-[120px]">Name</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Memo</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Invoice</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Dispatch</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Date Out</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Repairer</th>
                <th className="px-2 py-2 font-bold whitespace-nowrap border-r border-slate-200">Author</th>
                <th className="px-2 py-2 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-10 text-center text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading entries…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-10 text-center text-slate-500">
                    No job book entries yet.{' '}
                    <button
                      type="button"
                      className="text-ink font-semibold hover:underline"
                      onClick={() => router.push('/job-boards/job-book-entry/new')}
                    >
                      Create the first entry
                    </button>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const jobNum = row.jobNumber || row.jobNum || row.entryNumber || '—';
                  const date = fmtDateYmd(row.lastEntryDate || row.createdAt);
                  const cus = row.customerNumber || '—';
                  const acc = row.customerNumber || '—';
                  const order = row.orderNumber || '—';
                  const name = row.customerName || row.accountName || row.shippingName || '—';
                  const invoice = row.invoiceNum || '0';
                  const dispatch = row.freightMethod || row.outwardFreight || '—';
                  const dateOut = fmtDateOut(row.completionTime);
                  const repairer = row.repairer || '—';
                  const author = row.userName || '—';
                  const memo = '0';

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-200 hover:bg-slate-50/90 cursor-pointer ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                      onDoubleClick={() => router.push(`/job-boards/job-book-entry/${row.id}`)}
                    >
                      <td className="px-2 py-1.5 font-mono font-semibold text-ink whitespace-nowrap border-r border-slate-100">
                        {jobNum}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {date}
                      </td>
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap border-r border-slate-100">
                        {acc}
                      </td>
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap border-r border-slate-100">
                        {cus}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 max-w-[100px] truncate" title={order}>
                        {order}
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 max-w-[180px] truncate" title={detailsPreview(row)}>
                        {detailsPreview(row)}
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-100 max-w-[140px] truncate font-medium" title={String(name)}>
                        {name}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 tabular-nums text-right">
                        {memo}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 font-mono">
                        {invoice}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 max-w-[120px] truncate" title={dispatch}>
                        {dispatch}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {dateOut}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 max-w-[100px] truncate" title={repairer}>
                        {repairer}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap border-r border-slate-100 max-w-[90px] truncate" title={author}>
                        {author}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/job-boards/job-book-entry/${row.id}`);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-semibold text-slate-700 hover:bg-white"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === row.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(row.id, String(jobNum));
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose-200 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingId === row.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
