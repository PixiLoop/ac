'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { PrintTemplate, PrintTemplateVariant } from '../../../../components/print/PrintTemplate';
import { printLineDescription } from '../../../../lib/print-line-description';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID:           { bg: '#dcfce7', color: '#166534' },
  DRAFT:          { bg: '#fef9c3', color: '#854d0e' },
  ISSUED:         { bg: '#dbeafe', color: '#1d4ed8' },
  CANCELLED:      { bg: '#fee2e2', color: '#991b1b' },
  PARTIALLY_PAID: { bg: '#ffedd5', color: '#9a3412' },
  REVERSED:       { bg: '#e0e7ff', color: '#3730a3' },
};

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isDocket = searchParams.get('docket') === '1';
  const [data, setData] = useState<any>(null);
  const [variant, setVariant] = useState<PrintTemplateVariant>('template1');

  useEffect(() => {
    if (!id) return;
    api.get(`/invoices/${id}`).then(res => setData(res.data?.data ?? res.data));
  }, [id]);

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 600);
  }, [data]);

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
      Loading invoice...
    </div>
  );

  const items = data.items?.filter((i: any) => !i.deletedAt) ?? [];
  const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

  const subtotal = items.reduce((s: number, i: any) => s + Number(i.lineTotal ?? 0), 0);
  const freight  = Number(data.freight  ?? 0);
  const sundries = Number(data.sundries ?? 0);
  const labour   = Number(data.labour   ?? 0);
  const gst      = Number(data.gst      ?? 0);
  const total    = Number(data.total    ?? 0);
  const rounding = Number(data.rounding ?? 0);
  const paid     = Number(data.paidAmount ?? 0);
  const balance  = Number(data.balanceDue ?? 0);

  const isProforma = Boolean(data.isProforma) || data.status === 'DRAFT';
  const docType = isDocket ? 'DELIVERY DOCKET' : isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
  const pricedTotals = [
    { label: 'Subtotal (items)', value: fmt(subtotal) },
    ...(freight  ? [{ label: 'Freight',  value: fmt(freight)  }] : []),
    ...(sundries ? [{ label: 'Sundries', value: fmt(sundries) }] : []),
    ...(labour   ? [{ label: 'Labour',   value: fmt(labour)   }] : []),
    { label: 'GST', value: fmt(gst) },
    ...(rounding ? [{ label: 'Rounding', value: fmt(rounding) }] : []),
    { label: 'TOTAL', value: fmt(total), bold: true, color: '#1d4ed8', topBorder: true },
    ...(paid > 0    ? [{ label: 'Paid',        value: `(${fmt(paid)})`,  color: '#166534' }] : []),
    ...(balance > 0 ? [{ label: 'Balance Due', value: fmt(balance), bold: true, color: '#dc2626', bg: '#fef2f2' }] : []),
  ];
  const totals = pricedTotals;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Controls — hidden on print */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        {/* Template switcher */}
        {/* <select
          value={variant}
          onChange={e => setVariant(e.target.value as PrintTemplateVariant)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, cursor: 'pointer' }}
        >
          <option value="template1">Template 1 — Classic Blue</option>
          <option value="template2">Template 2 — Dark Header</option>
        </select> */}
        <button onClick={() => window.print()} style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {isDocket ? '🖨️ Print Delivery Docket / Save PDF' : isProforma ? '🖨️ Print Proforma / Save PDF' : '🖨️ Print / Save PDF'}
        </button>
        <button onClick={() => window.close()} style={{ background: '#e2e8f0', color: '#374151', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>

      <PrintTemplate
        variant={variant}
        docType={docType}
        footerNote={isProforma ? 'This is a proforma invoice and is not a tax invoice.' : undefined}
        docNumber={data.invoiceNumber}
        status={data.status}
        statusColor={STATUS_COLORS[data.status]}
        reference={data.reference}
        issuedAt={data.issuedAt}
        dueDate={data.dueDate}
        badges={[
          ...(data.salesOrder ? [{ label: 'Sales Order', value: data.salesOrder.orderNumber }] : []),
          ...(data.customer   ? [{ label: 'Customer',    value: data.customer.name           }] : []),
        ]}
        billTo={{
          name:     data.billingName || data.customer?.name,
          address1: data.billingAddress1,
          city:     data.billingCity,
          state:    data.billingState,
          postcode: data.billingPostcode,
        }}
        shipTo={{
          name:     data.shippingName,
          address1: data.shippingAddress1,
          city:     data.shippingCity,
          state:    data.shippingState,
          postcode: data.shippingPostcode,
        }}
        columns={[
          { label: 'Description', align: 'left' },
          { label: 'Qty',        align: 'right', width: 60  },
          { label: 'Unit Price', align: 'right', width: 100 },
          { label: 'Disc%',      align: 'right', width: 80  },
          { label: 'Line Total', align: 'right', width: 110 },
        ]}
        rows={items.map((item: any) => {
          const qty = Number(item.quantity ?? item.qty ?? 0);
          return [
            printLineDescription(item),
            qty,
            fmt(Number(item.unitPrice)),
            item.discountPct ? `${item.discountPct}%` : '—',
            fmt(Number(item.lineTotal)),
          ];
        })}
        totals={totals}
        notes={data.externalNotes}
      />
    </>
  );
}