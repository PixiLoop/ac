'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { useToast } from '../../../../components/ui/toast';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { Button } from '../../../../components/ui/button';
import DataTable from '../../../../components/common/DataTable';
import RowActions from '../../../../components/common/RowActions';
import { useAuth } from '../../../../providers/auth-provider';
import { createPermissionChecker } from '../../../../lib/permission';
import { InvoiceDto } from '../../../invoices/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/inventory/shared-ui';
import { QuotationDto } from '../../../quotations/page';
import { SalesOrderDto } from '../../../salesorders/page';

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

export default function CustomerViewPage({ params }: any) {
  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);
  const router = useRouter();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // ── Invoices State ──────────────────────────────────────────────────────────
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPageSize, setInvoicesPageSize] = useState(10);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const canViewInvoice = has('invoices.view');
  const canEditInvoice = has('invoices.edit');
  const [invoicesFilters, setInvoicesFilters] = useState<Record<string, string[]>>({});
  const [invoicesRows, setInvoicesRows] = useState<InvoiceDto[]>([]);
  const [invoicesSort, setInvoicesSort] = useState<{
    key: string | null;
    dir: 'asc' | 'desc' | null;
  }>({ key: 'createdAt', dir: 'desc' });

  // ── Quotations State ────────────────────────────────────────────────────────
  const [loadingQuotations, setLoadingQuotations] = useState(true);
  const [quotationsPage, setQuotationsPage] = useState(1);
  const [quotationsPageSize, setQuotationsPageSize] = useState(10);
  const [quotationsTotal, setQuotationsTotal] = useState(0);
  const canViewQuotation = has('quotations.view');
  const canEditQuotation = has('quotations.edit');
  const [quotationsFilters, setQuotationsFilters] = useState<Record<string, string[]>>({});
  const [quotationsRows, setQuotationsRows] = useState<QuotationDto[]>([]);
  const [quotationsSort, setQuotationsSort] = useState<{
    key: string | null;
    dir: 'asc' | 'desc' | null;
  }>({ key: 'createdAt', dir: 'desc' });

  // ── Sales Orders State ──────────────────────────────────────────────────────
  const [loadingSalesOrders, setLoadingSalesOrders] = useState(true);
  const [salesOrdersPage, setSalesOrdersPage] = useState(1);
  const [salesOrdersPageSize, setSalesOrdersPageSize] = useState(10);
  const [salesOrdersTotal, setSalesOrdersTotal] = useState(0);
  const canViewSalesOrders = has('fmcustomers.view') || has('salesorders.view');
  const canEditSalesOrders = has('fmcustomers.edit') || has('salesorders.edit');
  const [salesOrdersFilters, setSalesOrdersFilters] = useState<Record<string, string[]>>({});
  const [salesOrdersRows, setSalesOrdersRows] = useState<SalesOrderDto[]>([]);
  const [salesOrdersSort, setSalesOrdersSort] = useState<{
    key: string | null;
    dir: 'asc' | 'desc' | null;
  }>({ key: 'createdAt', dir: 'desc' });

  // ── Customer Loader ────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const res = await api.get(`/customers/${params.id}`);
      setCustomer(res.data.data);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load customer',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Invoices Loader ────────────────────────────────────────────────────────
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await api.get('/invoices', {
        params: {
          skip: (invoicesPage - 1) * invoicesPageSize,
          take: invoicesPageSize,
          sortKey: invoicesSort.key ?? undefined,
          sortDir: invoicesSort.dir ?? undefined,
          customerId: params.id,
          ...Object.fromEntries(
            Object.entries(invoicesFilters)
              .filter(([, v]) => v?.length)
              .map(([k, v]) => [`filter_${k}`, v.join(',')]),
          ),
        },
      });

      const payload = res.data?.data ?? res.data;
      setInvoicesRows(payload.items ?? []);
      setInvoicesTotal(payload.total ?? 0);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load invoices',
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (!canViewInvoice) return;
    if (!params.id) return;
    loadInvoices();
  }, [invoicesPage, invoicesPageSize, invoicesSort, invoicesFilters, canViewInvoice, params.id]);

  // ── Quotations Loader ──────────────────────────────────────────────────────
  const loadQuotations = async () => {
    setLoadingQuotations(true);
    try {
      const res = await api.get('/quotations', {
        params: {
          skip: (quotationsPage - 1) * quotationsPageSize,
          take: quotationsPageSize,
          sortKey: quotationsSort.key ?? undefined,
          sortDir: quotationsSort.dir ?? undefined,
          customerID: params.id,
          ...Object.fromEntries(
            Object.entries(quotationsFilters)
              .filter(([, v]) => v?.length)
              .map(([k, v]) => [`filter_${k}`, v.join(',')]),
          ),
        },
      });

      const payload = res.data?.data ?? res.data;
      setQuotationsRows(payload.items ?? []);
      setQuotationsTotal(payload.total ?? 0);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load quotations',
      });
    } finally {
      setLoadingQuotations(false);
    }
  };

  useEffect(() => {
    if (!canViewQuotation) return;
    if (!params.id) return;
    loadQuotations();
  }, [quotationsPage, quotationsPageSize, quotationsSort, quotationsFilters, canViewQuotation, params.id]);

  // ── Sales Orders Loader ────────────────────────────────────────────────────
  const loadSalesOrders = async () => {
    setLoadingSalesOrders(true);
    try {
      const res = await api.get('/salesorders', {
        params: {
          skip: (salesOrdersPage - 1) * salesOrdersPageSize,
          take: salesOrdersPageSize,
          sortKey: salesOrdersSort.key ?? undefined,
          sortDir: salesOrdersSort.dir ?? undefined,
          customerId: params.id,
          ...Object.fromEntries(
            Object.entries(salesOrdersFilters)
              .filter(([, v]) => v?.length)
              .map(([k, v]) => [`filter_${k}`, v.join(',')]),
          ),
        },
      });

      const payload = res.data?.data ?? res.data;
      setSalesOrdersRows(payload.items ?? []);
      setSalesOrdersTotal(payload.total ?? 0);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load sales orders',
      });
    } finally {
      setLoadingSalesOrders(false);
    }
  };

  useEffect(() => {
    if (!canViewSalesOrders) return;
    if (!params.id) return;
    loadSalesOrders();
  }, [salesOrdersPage, salesOrdersPageSize, salesOrdersSort, salesOrdersFilters, canViewSalesOrders, params.id]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const buildOptions = (values: (string | undefined | null)[]) =>
    Array.from(new Set(values.filter(Boolean))).sort().map(v => ({ label: v!, value: v! }));

  const handleXeroSync = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();
    setSyncingId(invoiceId);
    try {
      await api.post(`/admin/xero-config/push-invoice/${invoiceId}`, {});
      showToast({ type: 'success', title: 'Xero Sync', message: 'Invoice synced to Xero!' });
      loadInvoices();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Xero Error', message: err?.response?.data?.message || 'Sync failed' });
    } finally {
      setSyncingId(null);
    }
  };

  if (loading || !customer) return null;

  return (
    <AdminShell title="Customer Preview">
      {/* ACTION BAR */}
      <div className="mb-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>
          Back
        </Button>
        <Button onClick={() => router.push(`/customers/${customer.id}`)}>
          Edit Customer
        </Button>
      </div>
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-2 md:grid-cols-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pending-invoices">Pending Invoices</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="salesorders">Sales Orders</TabsTrigger>
        </TabsList>

        {/* ── Details tab ────────────────────────────────────────────────── */}
        <TabsContent value="details" className="space-y-6">
          <Section title="Customer Details">
            <Info label="Customer Name" value={customer.name} />
            <Info label="Registered Name" value={customer.registeredName} />
            <Info label="ABN" value={customer.abn} />
            <div>
              <div className="text-xs text-slate-500">FM Number</div>
              {customer.fmCustomer ? (
                <button
                  onClick={() =>
                    router.push(`/admin/fm-customers/${customer.fmCustomer.id}/view`)
                  }
                  className="mt-0.5 font-medium text-blue-600 hover:underline"
                >
                  {customer.fmCustomer.fmWebNumber}
                </button>
              ) : (
                <div className="mt-0.5 font-medium text-slate-900">
                  {customer.fmCustomerNumber || '-'}
                </div>
              )}
            </div>
          </Section>

          <Section title="Contacts">
            <div className="grid grid-cols-2 gap-4">
              {customer.contacts?.length ? (
                customer.contacts.map((c: any) => (
                  <Card
                    key={c.id}
                    highlight={c.isPrimary}
                    badge={c.isPrimary ? 'Primary' : undefined}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-slate-600">{c.email}</div>
                    <div className="text-sm text-slate-600">{c.phone || '-'}</div>
                  </Card>
                ))
              ) : (
                <EmptyState text="No contacts added" />
              )}
            </div>
          </Section>

          <Section title="Addresses">
            <div className="grid grid-cols-2 gap-4">
              {customer.addresses?.length ? (
                customer.addresses.map((a: any) => (
                  <Card
                    key={a.id}
                    highlight={a.isDefault}
                    badge={a.isDefault ? 'Default' : a.type}
                  >
                    <div className="font-medium">{a.addressLine1}</div>
                    <div className="text-sm text-slate-600">
                      {a.city}, {a.state}
                    </div>
                    <div className="text-sm text-slate-600">
                      {a.postcode}
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState text="No addresses added" />
              )}
            </div>
          </Section>

          <Section title="Account Details">
            <Info
              label="Credit Limit"
              value={
                customer.creditLimit != null
                  ? `$${customer.creditLimit}`
                  : '-'
              }
            />
            <Info
              label="Current Balance"
              value={
                customer.currentBalance != null
                  ? `$${customer.currentBalance}`
                  : '-'
              }
            />
            <Info
              label="Credit Hold"
              value={customer.creditHold ? 'Yes' : 'No'}
            />
            <Info
              label="Credit Hold Reason"
              value={customer.creditHoldReason}
            />
            <Info
              label="Invoices"
              value={customer.invoiceDelivery === 'EMAIL_PDF' ? 'Email as PDF' : 'Print and send with goods'}
            />
          </Section>

          <Section title="Payment Details">
            <Info label="Payment Terms" value={customer.paymentTerms} />
            <Info label="Price Level" value={customer.priceLevel} />
            <Info
              label="GST Exempt"
              value={customer.gstExempt ? 'Yes' : 'No'}
            />
          </Section>
        </TabsContent>
        <TabsContent value="pending-invoices" className="space-y-6">
          <DataTable
            loading={loading}
            data={customer.invoices}
            total={customer.invoices.length}
            page={1}
            pageSize={customer.invoices.length}
            onPageChange={() => { }}
            onPageSizeChange={() => { }}
            onSortChange={() => { }}
            onFilterChange={() => { }}
            showPaginationArrows={false}
            showDensityToggle={false}
            showRowsPerPage={false}
            columns={[
              {
                key: 'invoiceNumber',
                title: 'Invoice #',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                filterOptions: buildOptions(customer.invoices.map(r => r.invoiceNumber)),
              },
              {
                key: 'invoiceType',
                title: 'Type',
                filterable: true,
                filterType: 'multi',
                filterOptions: buildOptions(customer.invoices.map(r => r.invoiceType)).map(o => ({
                  label: INVOICE_TYPE_LABELS[o.value] ?? o.label,
                  value: o.value,
                })),
                render: (row: any) => (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_TYPE_COLORS[row.invoiceType] ?? 'bg-slate-100 text-slate-700'}`}>
                    {INVOICE_TYPE_LABELS[row.invoiceType] ?? row.invoiceType}
                  </span>
                ),
              },
              {
                key: 'salesOrder',
                title: 'Sales Order',
                render: (row: any) =>
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
                render: (row: any) => row.issuedAt ? new Date(row.issuedAt).toLocaleDateString('en-GB') : '—',
              },
              {
                key: 'dueDate',
                title: 'Due Date',
                render: (row: any) => row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-GB') : '—',
              },
              {
                key: 'total',
                title: 'Total',
                render: (row: any) => row.total != null ? `$${Number(row.total).toFixed(2)}` : '—',
              },
              {
                key: 'status',
                title: 'Status',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                filterOptions: buildOptions(customer.invoices.map(r => r.status)),
                render: (row: any) => (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] ?? ''}`}>
                    {row.status.replace('_', ' ')}
                  </span>
                ),
              },
              {
                key: 'actions',
                title: 'Actions',
                render: (row: any) => (
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
                      onEdit={row.status === 'PAID' || row.status === 'CANCELLED' ? undefined : () => router.push(`/invoices/${row.id}`)}
                      onDelete={async () => {
                        if (!confirm('Delete this invoice?')) return;
                        await api.delete(`/invoices/${row.id}`);
                        load();
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </TabsContent>

        {/* ── Invoices tab ───────────────────────────────────────────────── */}
        <TabsContent value="invoices" className="space-y-6">
          <DataTable
            loading={loadingInvoices}
            data={invoicesRows}
            total={invoicesTotal}
            page={invoicesPage}
            pageSize={invoicesPageSize}
            onPageChange={setInvoicesPage}
            onPageSizeChange={setInvoicesPageSize}
            onSortChange={setInvoicesSort}
            onFilterChange={setInvoicesFilters}
            columns={[
              {
                key: 'invoiceNumber',
                title: 'Invoice #',
                sortable: true,
              },
              {
                key: 'invoiceType',
                title: 'Type',
                filterable: true,
                filterType: 'multi',
                filterOptions: buildOptions(invoicesRows.map(r => r.invoiceType)).map(o => ({
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
                filterOptions: buildOptions(invoicesRows.map(r => r.status)),
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
                      onEdit={row.status === 'PAID' || row.status === 'CANCELLED' || !canEditInvoice ? undefined : () => router.push(`/invoices/${row.id}`)}
                      onDelete={async () => {
                        if (!confirm('Delete this invoice?')) return;
                        await api.delete(`/invoices/${row.id}`);
                        loadInvoices();
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </TabsContent>

        {/* ── Quotations tab ─────────────────────────────────────────────── */}
        <TabsContent value="quotations" className="space-y-6">
          <DataTable
            loading={loadingQuotations}
            data={quotationsRows}
            total={quotationsTotal}
            page={quotationsPage}
            pageSize={quotationsPageSize}
            onPageChange={setQuotationsPage}
            onPageSizeChange={setQuotationsPageSize}
            onSortChange={setQuotationsSort}
            onFilterChange={setQuotationsFilters}
            columns={[
              {
                key: 'quoteNumber',
                title: 'Quote #',
                sortable: true,
              },
              {
                key: 'customer',
                title: 'Customer',
                render: row => row.customer?.name ?? '—',
              },
              {
                key: 'quotationDate',
                title: 'Quote Date',
                sortable: true,
                render: row =>
                  row.quotationDate
                    ? new Date(row.quotationDate).toLocaleDateString('en-GB')
                    : '—',
              },
              {
                key: 'expiryDate',
                title: 'Expiry',
                render: row =>
                  row.expiryDate
                    ? new Date(row.expiryDate).toLocaleDateString('en-GB')
                    : '—',
              },
              {
                key: 'sections',
                title: 'Sections',
                render: row => (
                  <div className="text-xs space-x-1">
                    {row.hasPremium && <span>Premium</span>}
                    {row.hasEssential && <span>Essential</span>}
                    {row.hasOngoing && <span>Ongoing</span>}
                  </div>
                ),
              },
              {
                key: 'salesOrderId',
                title: 'Sales Order',
                render: row =>
                  row.salesOrderId ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/salesorders/${row.salesOrderId}`);
                      }}
                      className="text-blue-600 text-xs hover:underline font-medium"
                    >
                      View SO →
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  ),
              },
              {
                key: 'status',
                title: 'Status',
                sortable: true,
              },
              {
                key: 'actions',
                title: 'Actions',
                render: row => (
                  <RowActions
                    onView={() =>
                      router.push(`/quotations/${row.id}/view`)
                    }
                    onEdit={
                      row.salesOrderId
                        ? undefined
                        : canEditQuotation
                          ? () => router.push(`/quotations/${row.id}`)
                          : undefined
                    }
                    onDelete={async () => {
                      if (!confirm('Delete this quotation?')) return;
                      await api.delete(`/quotations/${row.id}`);
                      loadQuotations();
                    }}
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        {/* ── Sales Orders tab ───────────────────────────────────────────── */}
        <TabsContent value="salesorders" className="space-y-6">
          <DataTable
            loading={loadingSalesOrders}
            data={salesOrdersRows}
            total={salesOrdersTotal}
            page={salesOrdersPage}
            pageSize={salesOrdersPageSize}
            onPageChange={setSalesOrdersPage}
            onPageSizeChange={setSalesOrdersPageSize}
            onSortChange={setSalesOrdersSort}
            onFilterChange={setSalesOrdersFilters}
            columns={[
              {
                key: 'orderNumber',
                title: 'Order #',
                sortable: true,
              },
              {
                key: 'quotationNumber',
                title: 'Quote #',
                render: row =>
                  row.quotationId ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/quotations/${row.quotationId}`);
                      }}
                      className="text-blue-600 text-xs hover:underline font-medium"
                    >
                      {row.quotationNumber ?? 'View Quote'} →
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  ),
              },
              {
                key: 'customer',
                title: 'Customer',
                render: row => row.customer?.name ?? '—',
              },
              {
                key: 'actionDate',
                title: 'Action Date',
                sortable: true,
                render: row =>
                  row.actionDate
                    ? new Date(row.actionDate).toLocaleDateString('en-GB')
                    : '—',
              },
              {
                key: 'createdAt',
                title: 'Created Date',
                sortable: true,
                render: row =>
                  row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString('en-GB')
                    : '—',
              },
              {
                key: 'status',
                title: 'Status',
                sortable: true,
              },
              {
                key: 'actions',
                title: 'Actions',
                render: row => (
                  <RowActions
                    onView={() => router.push(`/salesorders/${row.id}/view`)}
                    onEdit={
                      canEditSalesOrders
                        ? () => router.push(`/salesorders/${row.id}`)
                        : undefined
                    }
                    onDelete={async () => {
                      if (!confirm('Delete this sales order?')) return;
                      await api.delete(`/salesorders/${row.id}`);
                      loadSalesOrders();
                    }}
                  />
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

/* ================= UI HELPERS ================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="mb-4 text-sm font-semibold text-slate-900">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 font-medium text-slate-900">
        {value || '-'}
      </div>
    </div>
  );
}

function Card({
  children,
  highlight,
  badge,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative rounded-md border p-4 ${highlight ? 'border-emerald-300 bg-emerald-50' : 'bg-white'
        }`}
    >
      {badge && (
        <span className="absolute right-2 top-2 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white">
          {badge}
        </span>
      )}
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-2 rounded-md border border-dashed p-4 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}