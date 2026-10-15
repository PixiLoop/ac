'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';

import { api } from '../../lib/api-client';
import { useAuth } from '../../providers/auth-provider';

import DataTable from '../../components/common/DataTable';
import RowActions from '../../components/common/RowActions';
import { createPermissionChecker } from '../../lib/permission';

export type SalesOrderDto = {
  id: string;
  orderNumber: string;
  status: string;
  priceLevel: string;
  total?: number | null;
  createdAt: string;
  actionDate: string;
  customer?: {
    name: string;
  };
  quotationId?: string;
  quotationNumber?: string;
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions, isSystem } = useAuth();

  const { has } = createPermissionChecker(permissions, isSystem);

  const canCreate = has('fmcustomers.create');
  const canEdit = has('fmcustomers.edit');
  const canView = has('fmcustomers.view');
  const canDelete = has('fmcustomers.delete');

  const [rows, setRows] = useState<SalesOrderDto[]>([]);
  const [rawRows, setRawRows] = useState<SalesOrderDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [sort, setSort] = useState<{
    key: string | null;
    dir: 'asc' | 'desc' | null;
  }>({ key: 'createdAt', dir: 'desc' });

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!canView) return;
    load();
  }, [page, pageSize, sort, search, filters, canView]);

  useEffect(() => {
    loadRaw();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const filterParams: Record<string, string> = {};
      Object.entries(filters).forEach(([key, values]) => {
        if (values && values.length > 0) {
          filterParams[`filter_${key}`] = values.join(',');
        }
      });

      const res = await api.get('/salesorders', {
        params: {
          search: search || undefined,
          skip: (page - 1) * pageSize,
          take: pageSize,
          sortKey: sort.key ?? undefined,
          sortDir: sort.dir ?? undefined,
          ...filterParams,
        },
      });

      const payload = res.data?.data ?? res.data;
      setRows(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load sales orders',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRaw = async () => {
    try {
      const res = await api.get('/salesorders', {
        params: { take: 1000 },
      });

      const payload = res.data?.data ?? res.data;
      setRawRows(payload.items ?? []);
    } catch { }
  };

  // STANDARD ALPHABETICAL FILTER BUILDER (for strings)
  const buildOptions = (values: (string | undefined | null)[]) =>
    Array.from(new Set(values.filter(Boolean)))
      .sort()
      .map(v => ({ label: v!, value: v! }));

  // CHRONOLOGICAL DATE FILTER BUILDER (for ISO date strings)
  const buildDateOptions = (dateStrings: (string | undefined | null)[]) => {
    const validTimestamps = Array.from(
      new Set(
        dateStrings
          .filter(Boolean)
          .map(d => new Date(d!).getTime())
          .filter(t => !isNaN(t))
      )
    ).sort((a, b) => a - b); // Ascending chronological sort

    return validTimestamps.map(timestamp => {
      const formatted = new Date(timestamp).toLocaleDateString('en-GB');
      return { label: formatted, value: formatted };
    });
  };

  const orderNumberOptions = () =>
    buildOptions(rawRows.map(r => r.orderNumber));

  const customerOptions = () =>
    buildOptions(rawRows.map(r => r.customer?.name));

  const actionDateOptions = () =>
    buildDateOptions(rawRows.map(r => r.actionDate));

  const createdDateOptions = () =>
    buildDateOptions(rawRows.map(r => r.createdAt));

  if (!canView) {
    return (
      <AdminShell title="Sales Orders">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Sales Orders" showTableDensity>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search sales orders..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-[280px]"
          />

          {canCreate && (
            <Button onClick={() => router.push('/salesorders/new')}>
              New Sales Order
            </Button>
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
              key: 'orderNumber',
              title: 'Order #',
              sortable: true,
              filterable: true,
              filterType: 'multi',
              filterOptions: orderNumberOptions(),
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
              sortable: true,
              filterable: true,
              filterType: 'multi',
              filterOptions: customerOptions(),
              render: row => row.customer?.name ?? '—',
            },
            {
              key: 'actionDate',
              title: 'Action Date',
              sortable: true,
              filterable: true,
              filterType: 'multi',
              filterOptions: actionDateOptions(),
              render: row =>
                row.actionDate
                  ? new Date(row.actionDate).toLocaleDateString('en-GB')
                  : '—',
            },
            {
              key: 'createdAt',
              title: 'Created',
              sortable: true,
              filterable: true,
              filterType: 'multi',
              filterOptions: createdDateOptions(),
              render: row =>
                row.createdAt
                  ? new Date(row.createdAt).toLocaleDateString('en-GB')
                  : '—',
            },
            {
              key: 'status',
              title: 'Status',
              sortable: true,
              filterable: true,
              filterType: 'multi',
              filterOptions: buildOptions(rawRows.map(r => r.status)),
            },
            {
              key: 'actions',
              title: 'Actions',
              render: row => (
                <RowActions
                  onView={() =>
                    router.push(`/salesorders/${row.id}/view`)
                  }
                  onEdit={() =>
                    router.push(`/salesorders/${row.id}`)
                  }
                  onDelete={async () => {
                    if (!confirm('Delete this sales order?')) return;
                    await api.delete(`/salesorders/${row.id}`);
                    load();
                    loadRaw();
                  }}
                />
              ),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}