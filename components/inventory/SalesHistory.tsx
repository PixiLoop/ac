'use client';

import React from 'react';
import { api } from '../../lib/api-client';
import { Input } from '../ui/input';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from './shared-ui';

type Props = { productId: string };

type Summary = {
  currentYear: { sold: number; buy: number };
  lastYear:    { sold: number; buy: number };
  avgY2Y3:     { sold: number };
  total:       { sold: number };
};

type MonthRow = { month: number; label: string; sales: number; buy: number };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RoField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-500 whitespace-nowrap">{label}</span>
      <Input readOnly value={String(value)}
        className="h-7 w-28 px-2 text-xs text-center bg-white" />
    </div>
  );
}

export function SalesHistory({ productId }: Props) {
  const [summary,  setSummary]  = React.useState<Summary | null>(null);
  const [monthly,  setMonthly]  = React.useState<MonthRow[]>([]);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/inventory/items/${productId}/sales-summary`),
      api.get(`/inventory/items/${productId}/sales-history`),
    ]).then(([s, h]) => {
      setSummary(s.data?.data ?? s.data);
      setMonthly(h.data?.data ?? h.data ?? []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  if (!summary) return <p className="py-8 text-center text-sm text-slate-400">No data.</p>;

  const summaryRows = [
    { period: 'Current Year',  sold: summary.currentYear.sold, buy: summary.currentYear.buy },
    { period: 'Last Year',     sold: summary.lastYear.sold,    buy: summary.lastYear.buy    },
    { period: 'Average Y2+Y3', sold: summary.avgY2Y3.sold,     buy: '—'                     },
    { period: 'Total Sales',   sold: summary.total.sold,        buy: '—'                     },
  ];

  return (
    <div className="space-y-4">

      {/* ── Stat cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="Year Sales"     value={summary.currentYear.sold} />
        <StatCard label="Last Year"      value={summary.lastYear.sold} />
        <StatCard label="Average Y2+Y3"  value={summary.avgY2Y3.sold} />
        <StatCard label="Total Sales"    value={summary.total.sold} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">

        {/* ── Summary table ── */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryRows.map((r) => (
                <TableRow key={r.period}>
                  <TableCell className="font-medium text-sm">{r.period}</TableCell>
                  <TableCell className="text-right">{r.sold}</TableCell>
                  <TableCell className="text-right">{r.buy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ── Monthly breakdown grid ── */}
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-100 border-b text-xs font-semibold text-slate-600 text-center">
            <div className="px-2 py-2 border-r">Month</div>
            <div className="px-2 py-2 border-r">Sales</div>
            <div className="px-2 py-2">Purchase</div>
          </div>
          {monthly.map((row) => (
            <div key={row.month}
              className="grid grid-cols-3 border-b last:border-b-0 text-xs text-center">
              <div className="px-2 py-1.5 border-r font-medium text-slate-600">{row.label}</div>
              <div className="px-2 py-1.5 border-r text-slate-700">{row.sales || '—'}</div>
              <div className="px-2 py-1.5 text-slate-700">{row.buy  || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}