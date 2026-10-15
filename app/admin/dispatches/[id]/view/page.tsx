'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../providers/auth-provider';
import { createPermissionChecker } from '../../../../../lib/permission';
import { AdminShell } from '../../../../../components/layout/AdminShell';
import { Button } from '../../../../../components/ui/button';
import { api } from '../../../../../lib/api-client';
import { useToast } from '../../../../../components/ui/toast';

export default function ViewDispatchPage() {
  const { id } = useParams();
  const router = useRouter();
  const { permissions, isSystem } = useAuth();
  const { showToast } = useToast();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('dispatches.view');

  const [loading, setLoading] = useState(true);
  const [dispatchData, setDispatchData] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Load Main Dispatch Details
  const loadDispatch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dispatch/${id}`);
      const rawData = res.data?.data ?? res.data ?? null;

      if (!rawData) {
        showToast({ type: 'error', title: 'Dispatch not found' });
        return;
      }

      // Map API DispatchedInvoices structure for component state
      const mappedInvoices = (rawData.DispatchedInvoices || []).map((di: any) => ({
        id: di.Invoice?.id || di.invoiceId,
        invoiceNumber: di.Invoice?.invoiceNumber || di.invoiceId,
        total: di.Invoice?.total ?? '0.00',
        createdAt: di.Invoice?.createdAt || rawData.createdAt,
        salesPersonName: di.salesPersonId || 'N/A',
        dispatchMethod: di.DispatchMethod?.label || di.dispatchCode || 'N/A',
        items: di.Invoice?.items || di.Invoice?.InvoiceItems || [],
        User: {
          firstName: di.User.firstName,
          lastName: di.User.lastName
        }
      }));

      const formattedDispatch = {
        id: rawData.dispatchNumber || rawData.id,
        dispatchDate: rawData.dispatchDate
          ? new Date(rawData.dispatchDate).toISOString().split('T')[0]
          : 'N/A',
        conNote: rawData.conNote || '',
        freightCost: rawData.freightCost || '0',
        freightCharge: rawData.freightCharge || '0',
        shippingAddress: rawData.shippingAddress || '',
        customer: {
          id: rawData.customerId,
          customerNumber: rawData.customer?.customerNumber || rawData.customerId || '—',
          name: rawData.customer?.name || 'Customer Details',
        },
        receiptNumber: rawData.receiptNumber || '—',
        invoices: mappedInvoices,
        Customer: rawData.Customer
      };

      setDispatchData(formattedDispatch);
      if (mappedInvoices.length > 0) {
        setSelectedInvoice(mappedInvoices[0]);
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to fetch dispatch data' });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (id) {
      loadDispatch();
    }
  }, [id]);


  if (!canView) {
    return (
      <AdminShell title="Dispatch Details">
        <p className="text-sm text-slate-600">You do not have permission to view this page.</p>
      </AdminShell>
    );
  }

  if (loading) {
    return (
      <AdminShell title="Dispatch Details">
        <div className="p-8 text-center text-sm text-slate-500">Loading dispatch details...</div>
      </AdminShell>
    );
  }

  if (!dispatchData) {
    return (
      <AdminShell title="Dispatch Details">
        <div className="p-8 text-center text-sm text-slate-500">No dispatch details available.</div>
      </AdminShell>
    );
  }

  const grandTotalAmount =
    selectedInvoice?.items?.reduce(
      (sum: number, item: any) => sum + (Number(item.lineTotal) || 0),
      0
    ) ?? 0;

  return (
    <AdminShell title={`Dispatch Details - ${dispatchData.id}`}>
      {/* Top Action Bar */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mb-6">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {/* View Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dispatch Details & Line Items */}
        <div className="lg:col-span-8 space-y-6">
          {/* Dispatch & Sales Details Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
              Dispatch & Sales Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Dispatch Date</label>
                <div className="text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 p-2 rounded-md">
                  {dispatchData.dispatchDate}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-400 block mb-1">Con Note</label>
                <div className="text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 p-2 rounded-md">
                  {dispatchData.conNote || '—'}
                </div>
              </div>
            </div>

            {/* Invoices Badges */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">
                  Associated Invoices ({dispatchData.invoices.length}):
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Customer: <strong className="text-slate-700">{dispatchData.customer.name}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {dispatchData.invoices.map((inv: any) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedInvoice(inv)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${selectedInvoice?.id === inv.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    <span>{inv.invoiceNumber}</span>
                    <span className="text-slate-400 font-mono text-[10px]">(${inv.total})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Invoice Details */}
            {selectedInvoice && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-3 rounded-md border">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Dispatch Method ({selectedInvoice.invoiceNumber})
                  </label>
                  <div className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 p-2 rounded">
                    {selectedInvoice.dispatchMethod}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Sales Person ({selectedInvoice.invoiceNumber})
                  </label>
                  <div className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 p-2 rounded">
                    {selectedInvoice.User.firstName} {selectedInvoice.User.lastName}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Consolidated Invoice Items Card */}
          {selectedInvoice && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700">
                  Line Items for <span className="font-mono text-indigo-600">{selectedInvoice.invoiceNumber}</span>
                </h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {selectedInvoice.items?.length || 0} {(selectedInvoice.items?.length || 0) === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-medium">
                      <th className="pb-2">Inv #</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-center">Backorder</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item: any, idx: number) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                            {selectedInvoice.invoiceNumber}
                          </td>
                          <td className="py-2.5 font-medium text-slate-800">
                            {item.description || item.productName || '—'}
                          </td>
                          <td className="py-2.5 text-center font-mono">{item.quantity || 0}</td>
                          <td className="py-2.5 text-center">
                            {item.backorderQty > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium">
                                {item.backorderQty}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">0</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            ${Number(item.unitPrice || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-semibold font-mono text-slate-800">
                            ${Number(item.lineTotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          No line items found for this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>




                  
                  <tfoot>
                    <tr className="border-t border-slate-200 font-semibold text-slate-800">
                      <td colSpan={5} className="pt-3 text-right">
                        Items Subtotal:
                      </td>
                      <td className="pt-3 text-right font-mono text-sm">
                        ${grandTotalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Shipping & Freight Details */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shipping Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
              Shipping Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Customer Number</label>
                <div className="text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 p-2 rounded">
                  {dispatchData.Customer.customerNumber}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Receipt Number</label>
                <div className="text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 p-2 rounded">
                  {dispatchData.receiptNumber}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-400 block mb-1">Shipping Address</label>
                <div className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded whitespace-pre-line min-h-[60px]">
                  {dispatchData.shippingAddress || 'No shipping address specified'}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-400 block mb-1">Invoice Date</label>
                <div className="text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 p-2 rounded">
                  {selectedInvoice?.createdAt
                    ? new Date(selectedInvoice.createdAt).toLocaleDateString()
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Freight & Charges */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
              Freight & Charges
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Freight Cost</span>
                <span className="text-sm font-mono font-semibold text-slate-700">
                  ${Number(dispatchData.freightCost).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                <span className="text-xs text-indigo-700 font-semibold">Freight Charge</span>
                <span className="text-sm font-mono font-bold text-indigo-800">
                  ${Number(dispatchData.freightCharge).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}