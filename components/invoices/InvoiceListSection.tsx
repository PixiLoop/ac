'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REVERSED: 'bg-orange-100 text-orange-800',
};

interface Props {
  invoices: any[];
  mode?: 'edit' | 'view'; // edit → "Edit →", view → "View →"
}

export function InvoiceListSection({ invoices, mode = 'edit' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!invoices.length) return null;

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-slate-50 px-4 py-3 border-b flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Invoices</h3>
          <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {invoices.length}
          </span>
        </div>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <table className="min-w-full text-sm bg-white">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Invoice #</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Issue Date</th>
              <th className="px-4 py-2 text-left">Due Date</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {invoices.map(inv => (
              <tr key={inv.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{inv.invoiceNumber}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status] ?? ''}`}>
                    {inv.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="px-4 py-2">
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  {inv.total != null ? `$${Number(inv.total).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    {mode === 'view' ? 'View →' : 'Edit →'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}