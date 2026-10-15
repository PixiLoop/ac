'use client';

import React from 'react';
import { api } from '../../lib/api-client';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from './shared-ui';
import Link from 'next/link';

type Props = { productId: string };

export function PurchaseOrderList({ productId }: Props) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get(`/inventory/items/${productId}/purchase-orders`)
      .then((res) => setRows(res.data?.data ?? res.data ?? []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [productId]);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-AU') : '—';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Purchase Orders</h3>
        {rows.length > 0 && (
          <span className="text-xs text-muted-foreground">{rows.length} line{rows.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No open purchase orders for this item.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Date</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Received Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    <Link href={`/inventory/purchase-orders/${r.purchaseOrder.id}`}>
                      {r.purchaseOrder.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{fmt(r.purchaseOrder.orderDate)}</TableCell>
                  <TableCell className=" font-medium">{fmt(r.purchaseOrder.expectedDate)}</TableCell>
                  <TableCell className=" font-medium">{r.purchaseOrder.receivedDate ? fmt(r.purchaseOrder.receivedDate) : '---'}</TableCell>
                  <TableCell className="text-sm">{r.orderedQty}</TableCell>
                  <TableCell className="text-sm">{r.receivedQty}</TableCell>
                  <TableCell className="text-sm text-slate-600">${r.unitCost}</TableCell>
                  <TableCell className="text-sm text-slate-600">${r.lineTotal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}