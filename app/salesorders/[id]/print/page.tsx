'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { PrintTemplate } from '../../../../components/print/PrintTemplate';
import { printLineDescription } from '../../../../lib/print-line-description';

export default function PrintSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/salesorders/${id}`).then(res => setData(res.data?.data ?? res.data));
  }, [id]);

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 600);
  }, [data]);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
        Loading sales order...
      </div>
    );
  }

  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const items = (data.items ?? []).filter((item: any) => !item.deletedAt);
  const parts = items.reduce((sum: number, item: any) => sum + Number(item.lineTotal ?? 0), 0);
  const freight = Number(data.freight ?? 0);
  const sundries = Number(data.sundries ?? 0);
  const labour = Number(data.labour ?? 0);
  const other = Number(data.otherCharges ?? 0);
  const gst = Number(data.gst ?? 0);
  const rounding = Number(data.rounding ?? 0);
  const total = Number(data.total ?? 0);

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button onClick={() => window.print()} style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          🖨️ Print Sales Order / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ background: '#e2e8f0', color: '#374151', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>
      <PrintTemplate
        docType="SALES ORDER"
        docNumber={data.orderNumber}
        status={data.status}
        statusColor={{ bg: '#dbeafe', color: '#1d4ed8' }}
        reference={data.customerPO}
        issuedAt={data.orderedAt || data.createdAt}
        issuedLabel="Order Date"
        dueDate={data.actionDate}
        dueLabel="Action Date"
        badges={[
          ...(data.customer?.name ? [{ label: 'Customer', value: `${data.customer.customerNumber ?? ''} ${data.customer.name}`.trim() }] : []),
          ...(data.orderType ? [{ label: 'Type', value: String(data.orderType).replace(/_/g, ' ') }] : []),
        ]}
        billTo={{
          name: data.billingName || data.customer?.name,
          address1: data.billingAddress1,
          city: data.billingCity,
          state: data.billingState,
          postcode: data.billingPostcode,
        }}
        shipTo={{
          name: data.shippingName,
          address1: data.shippingAddress1,
          city: data.shippingCity,
          state: data.shippingState,
          postcode: data.shippingPostcode,
        }}
        columns={[
          { label: 'Description', align: 'left' },
          { label: 'Qty', align: 'right', width: 60 },
          { label: 'Unit Price', align: 'right', width: 100 },
          { label: 'Disc%', align: 'right', width: 80 },
          { label: 'Line Total', align: 'right', width: 110 },
        ]}
        rows={items.map((item: any) => [
          printLineDescription(item),
          item.quantity,
          fmt(Number(item.unitPrice)),
          item.discountPct ? `${item.discountPct}%` : '—',
          fmt(Number(item.lineTotal)),
        ])}
        totals={[
          { label: 'Subtotal (items)', value: fmt(parts) },
          ...(freight ? [{ label: 'Freight', value: fmt(freight) }] : []),
          ...(sundries ? [{ label: 'Sundries', value: fmt(sundries) }] : []),
          ...(labour ? [{ label: 'Labour', value: fmt(labour) }] : []),
          ...(other ? [{ label: 'Other Charges', value: fmt(other) }] : []),
          { label: 'GST', value: fmt(gst) },
          ...(rounding ? [{ label: 'Rounding', value: fmt(rounding) }] : []),
          { label: 'TOTAL', value: fmt(total), bold: true, color: '#1d4ed8', topBorder: true },
        ]}
        notes={data.externalNotes}
      />
    </>
  );
}
