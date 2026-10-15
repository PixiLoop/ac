'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { InvoiceForm } from '../../../components/invoices/InvoiceForm';
import { api } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/toast';

export default function NewInvoicePage() {
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const fromPreinstall = searchParams.get('fromPreinstall');
    const fromSOId = searchParams.get('salesOrderId');

    const [seedData, setSeedData] = useState<any>(null);
    const [loading, setLoading] = useState(!!(fromSOId || fromPreinstall));
    const calledRef = useRef(false);

    // ── FMPreinstall → Invoice pre-populate
    useEffect(() => {
        if (!fromPreinstall) return;
        if (calledRef.current) return;
        calledRef.current = true;

        api.get(`/invoices/preinstall-data/${fromPreinstall}`)
            .then(res => {
                const d = res.data?.data ?? res.data;
                setSeedData({
                    // Invoice form understadning format
                    invoiceType: 'FMPREINSTALL',
                    customerId: d.customerId,
                    externalNotes: d.externalNotes ?? '',
                    internalNotes: d.internalNotes ?? '',
                    labour: d.labour ?? 0,
                    freight: d.freight ?? 0,
                    sundries: d.sundries ?? 0,
                    rounding: d.rounding ?? 0,

                    shippingName: d.shippingName ?? '',
                    shippingAddress1: d.shippingAddress1 ?? '',
                    shippingAddress2: d.shippingAddress2 ?? '',
                    shippingCity: '',
                    shippingState: '',
                    shippingPostcode: '',

                    billingName: d.billingName ?? '',
                    billingAddress1: d.billingAddress1 ?? '',
                    billingAddress2: d.billingAddress2 ?? '',
                    billingCity: '',
                    billingState: '',
                    billingPostcode: '',

                    // Items — JOBBOOK invoice
                    items: d.items ?? [],

                    // preinstallId track — InvoiceForm pass
                    _fromPreinstallId: fromPreinstall,
                });
            })
            .catch(err => {
                showToast({
                    type: 'error',
                    title: err?.response?.data?.message ?? 'Failed to load preinstall data',
                });
                router.push('/fm-preinstall');
            })
            .finally(() => setLoading(false));
    }, [fromPreinstall]);

    // ── SalesOrder → Invoice pre-populate (existing logic)
    useEffect(() => {
        if (!fromSOId) return;
        if (calledRef.current) return;
        calledRef.current = true;
        setLoading(true);

        api.get(`/invoices/uninvoiced-items/${fromSOId}`)
            .then(res => {
                const { so, uninvoicedItems, hasUninvoiced } = res.data?.data ?? res.data;

                if (!so) {
                    showToast({ type: 'error', title: 'Sales order not found' });
                    router.push('/salesorders');
                    return;
                }

                if (!hasUninvoiced) {
                    showToast({ type: 'info', title: 'Fully Invoiced', message: 'All items already invoiced' });
                    router.push(`/salesorders/${fromSOId}`);
                    return;
                }

                setSeedData({
                    invoiceType: 'SALESORDER',
                    customerId: so.customerId,
                    customer: so.customer ?? null,
                    salesOrderId: so.id,
                    salesOrder: {
                        id: so.id,
                        orderNumber: so.orderNumber,
                        customer: so.customer ?? null,
                    },
                    freight: so.freight ?? 0,
                    sundries: so.sundries ?? 0,
                    labour: so.labour ?? 0,
                    rounding: so.rounding ?? 0,
                    shippingName: so.shippingName ?? '',
                    shippingAddress1: so.shippingAddress1 ?? '',
                    shippingAddress2: so.shippingAddress2 ?? '',
                    shippingCity: so.shippingCity ?? '',
                    shippingState: so.shippingState ?? '',
                    shippingPostcode: so.shippingPostcode ?? '',
                    billingName: so.billingName ?? '',
                    billingAddress1: so.billingAddress1 ?? '',
                    billingAddress2: so.billingAddress2 ?? '',
                    billingCity: so.billingCity ?? '',
                    billingState: so.billingState ?? '',
                    billingPostcode: so.billingPostcode ?? '',
                    items: uninvoicedItems,
                });
            })
            .catch(() => router.push('/invoices'))
            .finally(() => setLoading(false));
    }, [fromSOId]);

    const waitingForSource = (!!fromSOId || !!fromPreinstall) && !seedData;

    if (loading || waitingForSource) {
        return (
            <AdminShell title="New Invoice">
                <div className="p-6 text-sm text-slate-500">Loading…</div>
            </AdminShell>
        );
    }

    return (
        <AdminShell title="New Invoice">
            <InvoiceForm key={fromSOId || fromPreinstall || 'new'} mode="create" initialData={seedData} />
        </AdminShell>
    );
}