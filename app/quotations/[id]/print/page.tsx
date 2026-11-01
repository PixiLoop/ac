'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { PrintTemplate } from '../../../../components/print/PrintTemplate';

const GROUP_LABELS: Record<string, string> = {
  GENERAL: 'General',
  PREMIUM: 'Premium Hardware',
  ESSENTIAL: 'Essential Hardware',
  ONGOING: 'Ongoing',
};

export default function PrintQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/quotations/${id}`).then(res => setData(res.data?.data ?? res.data));
  }, [id]);

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 600);
  }, [data]);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
        Loading quotation...
      </div>
    );
  }

  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const groups = (data.groups ?? []).filter((g: any) => !g.deletedAt);
  const showGroup = groups.length > 1;
  const items = groups.flatMap((group: any) =>
    (group.items ?? [])
      .filter((item: any) => !item.deletedAt)
      .map((item: any) => ({
        ...item,
        description: showGroup
          ? `${GROUP_LABELS[group.groupType] ?? group.groupType}: ${item.description}`
          : item.description,
      })),
  );

  const parts = groups.reduce((sum: number, group: any) => sum + Number(group.subtotal ?? 0), 0)
    || items.reduce((sum: number, item: any) => sum + Number(item.lineTotal ?? 0), 0);
  const gst = groups.reduce((sum: number, group: any) => sum + Number(group.gst ?? 0), 0);
  const freight = Number(data.freight ?? 0);
  const sundries = Number(data.sundries ?? 0);
  const labour = Number(data.labour ?? 0);
  const other = Number(data.otherCharges ?? 0);
  const rounding = Number(data.rounding ?? 0);
  const groupTotal = groups.reduce((sum: number, group: any) => sum + Number(group.total ?? 0), 0);
  const total = (groupTotal || parts + gst) + freight + sundries + labour + other + rounding;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button onClick={() => window.print()} style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          🖨️ Print Quote / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ background: '#e2e8f0', color: '#374151', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>
      <PrintTemplate
        docType="QUOTATION"
        docNumber={data.quoteNumber}
        status={data.status}
        statusColor={{ bg: '#fef9c3', color: '#854d0e' }}
        reference={data.requestNumber}
        issuedAt={data.quotationDate || data.createdAt}
        issuedLabel="Quote Date"
        dueDate={data.expiryDate}
        dueLabel="Expiry"
        badges={[
          ...(data.customer?.customerNumber ? [{ label: 'Customer', value: data.customer.customerNumber }] : []),
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
          item.description,
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
        footerNote="This quotation is valid until the expiry date."
      />
    </>
  );
}
