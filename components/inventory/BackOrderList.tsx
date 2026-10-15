'use client';

import React from 'react';
import { api } from '../../lib/api-client';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from './shared-ui';
import Link from 'next/link';

type Props = { productId: string };

type BackOrderRow = {
  id: string;
  salesOrderId: string;
  partNo: string;
  description: string;
  customer: string;
  orderNo: string;
  qtyBackorder: number;
  expectedDate: string | null;
  supplier: string;
  status: string;
};

export function BackOrderList({ productId }: Props) {
  const [rows, setRows] = React.useState<BackOrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get(`/inventory/items/${productId}/back-orders`)
      .then((res) => setRows(res.data?.data ?? res.data ?? []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [productId]);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-AU') : '—';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Back Orders</h3>
        {rows.length > 0 && (
          <span className="text-xs text-muted-foreground">{rows.length} line{rows.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No open back orders for this item.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Qty B/O</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    <Link href={`/salesorders/${r.salesOrderId}/view`}>
                      {r.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.customer}</TableCell>
                  <TableCell className="text-right font-medium">{r.qtyBackorder}</TableCell>
                  <TableCell className="text-sm">{fmt(r.expectedDate)}</TableCell>
                  <TableCell className="text-sm text-slate-600">{r.supplier}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600">
                      {r.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}