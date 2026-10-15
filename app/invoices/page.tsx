'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { api } from '../../lib/api-client';
import DataTable from '../../components/common/DataTable';
import RowActions from '../../components/common/RowActions';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

export type InvoiceDto = {
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    status: string;
    total?: number | null;
    dueDate?: string;
    issuedAt?: string;
    createdAt: string;
    customer?: { name: string };
    salesOrder?: { orderNumber: string; id: string };
};

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    ISSUED: 'bg-blue-100 text-blue-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    REVERSED: 'bg-orange-100 text-orange-800',
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
    FREEHAND: 'Free Hand',
    JOBBOOK: 'Job Book',
    SALESORDER: 'Sales Order',
    CREDIT: 'Credit',
    REVERSAL: 'Reversal',
    SUBSCRIPTION: 'Subscription',
    FMPREINSTALL: 'FM Preinstall',
};

const INVOICE_TYPE_COLORS: Record<string, string> = {
    FREEHAND: 'bg-slate-100 text-slate-700',
    JOBBOOK: 'bg-purple-100 text-purple-700',
    SALESORDER: 'bg-blue-100 text-blue-700',
    CREDIT: 'bg-amber-100 text-amber-700',
    REVERSAL: 'bg-red-100 text-red-700',
    SUBSCRIPTION: 'bg-teal-100 text-teal-700',
    FMPREINSTALL: 'bg-cyan-100 text-cyan-800',
};

export default function InvoicesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { permissions, isSystem } = useAuth();
    const { has } = createPermissionChecker(permissions, isSystem);

    const canView = has('invoices.view');
    const canCreate = has('invoices.create');
    const canEdit = has('invoices.edit');
    const canDelete = has('invoices.delete');

    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [rows, setRows] = useState<InvoiceDto[]>([]);
    const [rawRows, setRawRows] = useState<InvoiceDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({ key: 'createdAt', dir: 'desc' });
    const [filters, setFilters] = useState<Record<string, string[]>>({});

    useEffect(() => { load(); }, [page, pageSize, sort, search, filters]);
    useEffect(() => { loadRaw(); }, []);



    const load = async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const res = await api.get('/invoices', {
                params: {
                    search: search || undefined,
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                    sortKey: sort.key ?? undefined,
                    sortDir: sort.dir ?? undefined,
                    ...Object.fromEntries(
                        Object.entries(filters)
                            .filter(([, v]) => v?.length)
                            .map(([k, v]) => [`filter_${k}`, v.join(',')]),
                    ),
                },
            });
            const payload = res.data?.data ?? res.data;
            setRows(payload.items ?? []);
            setTotal(payload.total ?? 0);
        } catch {
            showToast({ type: 'error', title: 'Failed to load invoices' });
        } finally {
            setLoading(false);
        }
    };

    const handleXeroSync = async (e: React.MouseEvent, invoiceId: string) => {
        e.stopPropagation();
        setSyncingId(invoiceId);
        try {
            await api.post(`/admin/xero-config/push-invoice/${invoiceId}`, {});
            showToast({ type: 'success', title: 'Xero Sync', message: 'Invoice synced to Xero!' });
            load();
        } catch (err: any) {
            showToast({ type: 'error', title: 'Xero Error', message: err?.response?.data?.message || 'Sync failed' });
        } finally {
            setSyncingId(null);
        }
    };

    const loadRaw = async () => {
        if (!canView) return;
        try {
            const res = await api.get('/invoices', { params: { take: 1000 } });
            const payload = res.data?.data ?? res.data;
            setRawRows(payload.items ?? []);
        } catch { }
    };

    const buildOptions = (values: (string | undefined | null)[]) =>
        Array.from(new Set(values.filter(Boolean))).sort().map(v => ({ label: v!, value: v! }));

    if (!canView && !canCreate) {
        return (
            <AdminShell title="Invoices">
                <p className="text-sm text-slate-600">You do not have permission.</p>
            </AdminShell>
        );
    }

    return (
        <AdminShell title="Invoices" showTableDensity>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <Input
                        placeholder="Search invoices..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-[280px]"
                    />
                    {canCreate && (
                        <Button onClick={() => router.push('/invoices/new')}>New Invoice</Button>
                    )}
                </div>

                <DataTable
                    loading={loading}
                    data={rows}
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    onSortChange={setSort}
                    onFilterChange={setFilters}
                    columns={[
                        {
                            key: 'invoiceNumber',
                            title: 'Invoice #',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            filterOptions: buildOptions(rawRows.map(r => r.invoiceNumber)),
                        },
                        {
                            key: 'invoiceType',
                            title: 'Type',
                            filterable: true,
                            filterType: 'multi',
                            filterOptions: buildOptions(rawRows.map(r => r.invoiceType)).map(o => ({
                                label: INVOICE_TYPE_LABELS[o.value] ?? o.label,
                                value: o.value,
                            })),
                            render: row => (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_TYPE_COLORS[row.invoiceType] ?? 'bg-slate-100 text-slate-700'}`}>
                                    {INVOICE_TYPE_LABELS[row.invoiceType] ?? row.invoiceType}
                                </span>
                            ),
                        },
                        {
                            key: 'customer',
                            title: 'Customer',
                            render: row => row.customer?.name ?? '—',
                        },
                        {
                            key: 'salesOrder',
                            title: 'Sales Order',
                            render: row =>
                                row.salesOrder ? (
                                    <button
                                        onClick={e => { e.stopPropagation(); router.push(`/salesorders/${row.salesOrder!.id}`); }}
                                        className="text-blue-600 text-xs hover:underline"
                                    >
                                        {row.salesOrder.orderNumber}
                                    </button>
                                ) : '—',
                        },
                        {
                            key: 'issuedAt',
                            title: 'Issue Date',
                            sortable: true,
                            render: row => row.issuedAt ? new Date(row.issuedAt).toLocaleDateString('en-GB') : '—',
                        },
                        {
                            key: 'dueDate',
                            title: 'Due Date',
                            render: row => row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-GB') : '—',
                        },
                        {
                            key: 'total',
                            title: 'Total',
                            align: 'right',
                            render: row => row.total != null ? `$${Number(row.total).toFixed(2)}` : '—',
                        },
                        {
                            key: 'status',
                            title: 'Status',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            filterOptions: buildOptions(rawRows.map(r => r.status)),
                            render: row => (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] ?? ''}`}>
                                    {row.status.replace('_', ' ')}
                                </span>
                            ),
                        },
                        {
                            key: 'actions',
                            title: 'Actions',
                            render: row => (
                                <div className="flex items-center justify-end gap-1">
                                    {/* Xero sync if status not draft */}
                                    {row.status !== 'DRAFT' && (
                                        <button
                                            onClick={e => handleXeroSync(e, row.id)}
                                            disabled={syncingId === row.id}
                                            title="Sync to Xero"
                                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#13B5EA] disabled:opacity-40"
                                        >
                                            {syncingId === row.id ? (
                                                <span className="text-[10px]">...</span>
                                            ) : (
                                                <span className="text-xs font-bold">X</span>
                                            )}
                                        </button>
                                    )}
                                    <RowActions
                                        onView={() => router.push(`/invoices/${row.id}/view`)}
                                        onEdit={row.status === 'PAID' || row.status === 'CANCELLED' || row.status === 'REVERSED' ? undefined : () => router.push(`/invoices/${row.id}`)}
                                        onDelete={async () => {
                                            if (!confirm('Delete this invoice?')) return;
                                            await api.delete(`/invoices/${row.id}`);
                                            load(); loadRaw();
                                        }}
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </AdminShell>
    );
}
