'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { api } from '../../../../lib/api-client';
import { Button } from '../../../../components/ui/button';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { getLastInvoicePeriod } from '../../../../lib/utils';
export default function ViewSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter()
  const [loading, setLoading] = useState(true);
  const [orderNo, setOrderNo] = useState('');
  const [subscription, setSubscription] = useState(null)
  const [open, setOpen] = useState(true);
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/fm-subscription-reports/${id}`);
        const data = res.data?.data ?? res.data;

        console.log(data, "dataaaaaaaaaaaaaaaaaaa");


        setOrderNo(data.subscriptionNumber ?? '');
        setSubscription(data)
        setLoading(false);

      } catch (err) {
        console.error(err);
        router.push('/web-reports');
      }
    }

    load();
  }, [id, router]);

  if (loading || !subscription) {
    return (
      <AdminShell title="Web Reports">
        <div className="p-6 text-sm text-slate-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`Web Reports: ${orderNo}`}>
      <div className="flex justify-end mb-4 gap-2">
        <Button onClick={() => router.push(`/web-reports/${id}`)}>
          Edit
        </Button>
        {subscription.invoices.length > 0 && (
          <Button
            variant="outline"
            onClick={() => router.push(`/invoices/${subscription.invoices[0].id}/view`)}
          >
            🔗 View Invoice {subscription.invoices[0].invoiceNumber}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push('/web-reports')}>
          Back
        </Button>
      </div>

      <div className="space-y-0">
        <div className="rounded-md border bg-white p-4">

          <div className="border rounded-md p-3 mb-4 bg-gray-50 space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-3">
              <Input label="Subscription Number" value={subscription.subscriptionNumber} />
              <Input label="Subscription Name" value={subscription.name} />
              <Input label="Account Number" value={subscription.fmCustomer.customer.customerNumber} />
              <Input label="FM Customer" value={subscription.fmCustomer.fmWebNumber} />
              <Input label="Report Date" value={new Date(subscription.createdAt).toLocaleDateString('en-GB')} />
              <Input label="Fleet Name" value={subscription.fmCustomer.fleetName} />
              <Input label="MIX Service" value={""} />
              <Input label="Depot" value={subscription.fmCustomer.depots} />
              <Input label="Last Invoice" value={subscription.invoices.length > 0 ? subscription.invoices[0].invoiceNumber : "-"} />
              <Input label="Invoice Date" value={subscription.invoices.length > 0 ? new Date(subscription.invoices[0].issuedAt).toLocaleDateString('en-GB') : "-"} />
              <Input label="Last FMW Invoice Period" value={subscription.invoices.length > 0 ? getLastInvoicePeriod(new Date(subscription.lastInvoicedPeriodEnd)) : "-"} />
              <div className="flex items-center gap-6 pt-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={subscription.isActive}
                  />
                  Report Active
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={subscription.priceIncludesGst}
                  />
                  Price includes GST
                </label>
              </div>
            </div>
            {subscription.lines.length > 0 && (
              <>
                <div className=''>
                  <div className='mb-2'>Line Items</div>
                  <table className="w-full text-xs border mb-3 bg-white">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-1 text-left">Item</th>
                        <th className="px-2 py-1 text-right">Qty</th>
                        <th className="px-2 py-1 text-right">Rate</th>
                        <th className="px-2 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscription.lines?.length === 0 && (
                        <tr><td colSpan={4} className="text-center text-slate-400 py-3">No eligible active assets found</td></tr>
                      )}
                      {subscription.lines?.map((l: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{l.label}</td>
                          <td className="px-2 py-1 text-right">{l.qty}</td>
                          <td className="px-2 py-1 text-right">${Number(l.rate).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">${Number(l.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-semibold text-sm mb-3">
                  Subtotal: ${Number(subscription.subtotal ?? 0).toFixed(2)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
