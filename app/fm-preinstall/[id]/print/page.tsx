'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { PrintTemplate } from '../../../../components/print/PrintTemplate';

export default function PrintFmPreinstallPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/fm-preinstall/${id}`).then(res => setData(res.data?.data ?? res.data));
  }, [id]);

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 600);
  }, [data]);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
        Loading FM pre-install...
      </div>
    );
  }

  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const joinAddress = (...parts: Array<string | null | undefined>) =>
    parts.map(part => String(part ?? '').trim()).filter(Boolean).join(', ');
  const items = (data.items ?? []).filter((item: any) => !item.deletedAt);
  const detail = data.installDetail ?? {};
  const parts = Number(data.chargeParts ?? 0) || items.reduce((sum: number, item: any) => sum + Number(item.lineTotal ?? 0), 0);
  const freight = Number(data.chargeFreight ?? 0);
  const sundries = Number(data.chargeSundries ?? 0);
  const labour = Number(data.chargeLabour ?? 0);
  const gst = Number(data.chargeGst ?? 0);
  const rounding = Number(data.chargeRounding ?? 0);
  const total = Number(data.chargeTotal ?? 0) || parts + freight + sundries + labour + gst + rounding;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button onClick={() => window.print()} style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          🖨️ Print FM Pre-Install / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ background: '#e2e8f0', color: '#374151', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>
      <PrintTemplate
        docType="FM PRE-INSTALL"
        docNumber={data.preinstallNo}
        status={data.status}
        statusColor={{ bg: '#cffafe', color: '#155e75' }}
        reference={data.orderNumber}
        issuedAt={data.createdAt}
        issuedLabel="Created"
        dueDate={detail.installDate}
        dueLabel="Install Date"
        badges={[
          ...(data.type ? [{ label: 'Type', value: String(data.type).replace(/_/g, ' ') }] : []),
          ...(data.customer?.name ? [{ label: 'Customer', value: data.customer.name }] : []),
          ...(detail.assetNumber ? [{ label: 'Asset', value: detail.assetNumber }] : []),
          ...(detail.fleetNumber ? [{ label: 'Fleet', value: detail.fleetNumber }] : []),
          ...(detail.regoNumber ? [{ label: 'Rego', value: detail.regoNumber }] : []),
          ...(detail.serviceCode ? [{ label: 'Service', value: detail.serviceCode }] : []),
        ]}
        billTo={{
          name: data.billingName || data.customer?.name,
          address1: joinAddress(data.billingAddress1, data.billingAddress2, data.billingAddress3),
        }}
        shipTo={{
          name: data.shippingName,
          address1: joinAddress(data.shippingAddress1, data.shippingAddress2, data.shippingAddress3),
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
          { label: 'Parts', value: fmt(parts) },
          ...(freight ? [{ label: 'Freight', value: fmt(freight) }] : []),
          ...(sundries ? [{ label: 'Sundries', value: fmt(sundries) }] : []),
          ...(labour ? [{ label: 'Labour', value: fmt(labour) }] : []),
          { label: 'GST', value: fmt(gst) },
          ...(rounding ? [{ label: 'Rounding', value: fmt(rounding) }] : []),
          { label: 'TOTAL', value: fmt(total), bold: true, color: '#1d4ed8', topBorder: true },
        ]}
        notes={data.notes}
      />
    </>
  );
}
