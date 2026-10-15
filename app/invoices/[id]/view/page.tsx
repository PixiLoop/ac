'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/layout/AdminShell';
import { InvoiceForm } from '../../../../components/invoices/InvoiceForm';
import { api } from '../../../../lib/api-client';

export default function ViewInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/invoices/${id}`)
      .then(res => setData(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AdminShell title="View Invoice"><div className="p-6">Loading…</div></AdminShell>;
  if (!data)   return <AdminShell title="View Invoice"><div className="p-6">Invoice not found.</div></AdminShell>;

  return (
    <AdminShell title={`Invoice ${data.invoiceNumber}`}>
      <InvoiceForm mode="view" initialData={data} onEdit={() => router.push(`/invoices/${id}`)} />
    </AdminShell>
  );
}
