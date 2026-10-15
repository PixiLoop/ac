'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { InvoiceForm } from '../../../components/invoices/InvoiceForm';
import { api } from '../../../lib/api-client';

export default function EditInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        api.get(`/invoices/${id}`)
            .then(res => setData(res.data?.data ?? res.data))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <AdminShell title="Edit Invoice"><div className="p-6">Loading…</div></AdminShell>;
    if (!data) return <AdminShell title="Edit Invoice"><div className="p-6">Invoice not found.</div></AdminShell>;

    return (
        <AdminShell title={`Edit Invoice ${data.invoiceNumber}`}>
            <InvoiceForm mode="edit" initialData={data} />
        </AdminShell>
    );
}