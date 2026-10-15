'use client';

import * as React from 'react';
import { FilePlus2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import {
  Card, CardHeader, CardTitle, CardContent,
  SupplierStatusBadge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from './shared-ui';

type Props = { supplierId: string };

export function SupplierView({ supplierId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [supplier, setSupplier] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    api.get(`/inventory/suppliers/${supplierId}`)
      .then((res) => setSupplier(res.data?.data ?? res.data))
      .catch(() => showToast({ type: 'error', title: 'Failed to load supplier' }))
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!supplier) {
    return <p className="text-sm text-slate-600">Supplier not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Supplier summary header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-900">{supplier.name}</span>
                <SupplierStatusBadge status={supplier.status} />
              </div>
              <div className="text-[12px] text-slate-500 space-x-4">
                <span>Code: <strong>{supplier.code}</strong></span>
                {supplier.abn && <span>ABN: <strong>{supplier.abn}</strong></span>}
                {supplier.repContactName && <span>Contact: <strong>{supplier.repContactName}</strong></span>}
                {supplier.repContactEmail && <span>Email: <strong>{supplier.repContactEmail}</strong></span>}
                {supplier.repContactPhone && <span>Phone: <strong>{supplier.repContactPhone}</strong></span>}
                {supplier.tradingTerms && <span>Terms: <strong>{supplier.tradingTerms}</strong></span>}
                {supplier.paymentMethod && <span>Payment: <strong>{supplier.paymentMethod}</strong></span>}
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push(`/inventory/suppliers/${supplierId}`)}>
              Edit Supplier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delivery & Postal */}
        <Card>
          <CardHeader><CardTitle>Addresses</CardTitle></CardHeader>
          <CardContent className="text-[12px] space-y-3">
            <div>
              <p className="font-medium text-slate-700 mb-1">Delivery</p>
              <p>{supplier.deliveryAddress1 || '—'}</p>
              {supplier.deliveryAddress2 && <p>{supplier.deliveryAddress2}</p>}
              {supplier.deliveryAddress3 && <p>{supplier.deliveryAddress3}</p>}
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">Postal</p>
              <p>{supplier.postalAddress1 || '—'}</p>
              {supplier.postalAddress2 && <p>{supplier.postalAddress2}</p>}
              {supplier.postalAddress3 && <p>{supplier.postalAddress3}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Ordering Details */}
        <Card>
          <CardHeader><CardTitle>Ordering Details</CardTitle></CardHeader>
          <CardContent className="text-[12px] space-y-1">
            {supplier.serviceRep && <div><span className="text-slate-500">Service Rep:</span> <strong>{supplier.serviceRep}</strong></div>}
            {supplier.orderPhone && <div><span className="text-slate-500">Order Phone:</span> <strong>{supplier.orderPhone}</strong></div>}
            {supplier.orderEmail && <div><span className="text-slate-500">Order Email:</span> <strong>{supplier.orderEmail}</strong></div>}
            {supplier.ordersClose && <div><span className="text-slate-500">Orders Close:</span> <strong>{supplier.ordersClose}</strong></div>}
            {supplier.orderMethod && <div><span className="text-slate-500">Order Method:</span> <strong>{supplier.orderMethod}</strong></div>}
            {supplier.dispatchMethod && <div><span className="text-slate-500">Dispatch:</span> <strong>{supplier.dispatchMethod}</strong></div>}
            {supplier.minOrderValue != null && <div><span className="text-slate-500">Min Order:</span> <strong>${Number(supplier.minOrderValue).toFixed(2)}</strong></div>}
            {supplier.freightCost != null && <div><span className="text-slate-500">Freight Cost:</span> <strong>${Number(supplier.freightCost).toFixed(2)}</strong></div>}
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
          <CardContent className="text-[12px]">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="font-medium text-slate-700 mb-1">Representative</p>
                <p>{supplier.repContactName || '—'}</p>
                {supplier.repContactPhone && <p>{supplier.repContactPhone}</p>}
                {supplier.repContactMobile && <p>{supplier.repContactMobile}</p>}
                {supplier.repContactEmail && <p>{supplier.repContactEmail}</p>}
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">Accounts Dept</p>
                <p>{supplier.accContactName || '—'}</p>
                {supplier.accContactPhone && <p>{supplier.accContactPhone}</p>}
                {supplier.accContactFax && <p>Fax: {supplier.accContactFax}</p>}
                {supplier.accContactEmail && <p>{supplier.accContactEmail}</p>}
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">Warranty Dept</p>
                <p>{supplier.warContactName || '—'}</p>
                {supplier.warContactPhone && <p>{supplier.warContactPhone}</p>}
                {supplier.warContactFax && <p>Fax: {supplier.warContactFax}</p>}
                {supplier.warContactEmail && <p>{supplier.warContactEmail}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader><CardTitle>Account Status</CardTitle></CardHeader>
          <CardContent className="text-[12px]">
            <div className="flex gap-8">
              {/* Left: fields */}
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 min-w-[220px]">
                <span className="text-slate-500 whitespace-nowrap">Current Balance</span>
                <span className="font-semibold text-right border px-2 py-0.5 rounded">
                  {supplier.currentBalance != null ? `$ ${Number(supplier.currentBalance).toFixed(2)}` : '0.00'}
                </span>
                <span className="text-slate-500 whitespace-nowrap">Credit Limit</span>
                <span className="text-right">{supplier.creditLimit != null ? Number(supplier.creditLimit).toFixed(2) : '0.00'}</span>
                <span className="text-slate-500 whitespace-nowrap">Last Invoice</span>
                <span>{supplier.lastInvoice ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Last Payment</span>
                <span>{supplier.lastPayment ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Last Transaction</span>
                <span>{supplier.lastTransaction ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Last Exp Record</span>
                <span>{supplier.lastExpRecord ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Trading Terms</span>
                <span>{supplier.tradingTerms ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Payment Method</span>
                <span>{supplier.paymentMethod ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Biller Code / B.S.B.</span>
                <span>{supplier.billerCodeBsb ?? '—'}</span>
                <span className="text-slate-500 whitespace-nowrap">Account / Reference</span>
                <span>{supplier.accountReference ?? '—'}</span>
              </div>

              {/* Right: Transaction History */}
              <div className="flex-1">
                <p className="font-semibold text-slate-700 mb-1">Transaction History</p>
                <div className="overflow-hidden rounded border border-slate-200">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-1 font-semibold text-slate-600">Year</th>
                        <th className="px-3 py-1 font-semibold text-slate-600">Purchases</th>
                        <th className="px-3 py-1 font-semibold text-slate-600">Payments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(supplier.transactionHistory ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-center text-slate-400">No history</td>
                        </tr>
                      ) : (
                        (supplier.transactionHistory as any[]).map((row: any) => (
                          <tr key={row.year} className="border-t border-slate-100 even:bg-yellow-50">
                            <td className="px-3 py-0.5 text-left text-slate-500">{row.year}</td>
                            <td className="px-3 py-0.5">{Number(row.purchases).toFixed(2)}</td>
                            <td className="px-3 py-0.5">{Number(row.payments).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                        <td className="px-3 py-1 text-left">Total</td>
                        <td className="px-3 py-1">
                          {(supplier.transactionHistory ?? []).reduce((s: number, r: any) => s + Number(r.purchases), 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-1">
                          {(supplier.transactionHistory ?? []).reduce((s: number, r: any) => s + Number(r.payments), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Supplier Orders</CardTitle>
            <Button><FilePlus2 className="mr-2 h-4 w-4" />Create Order</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Order No" />
            <Input placeholder="Status" defaultValue="All" />
            <Input placeholder="From Date" />
            <Input placeholder="To Date" />
          </div>
          <div className="overflow-hidden rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-slate-400 text-center" colSpan={6}>No orders found for this supplier.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Receipts / GRN */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Stock Receipts / GRN</CardTitle>
            <Button><FilePlus2 className="mr-2 h-4 w-4" />Create Receipt</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN No</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-slate-400 text-center" colSpan={5}>No receipts found for this supplier.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Posting a receipt updates on-hand stock, supplier order balances, last cost, and stock movement history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
