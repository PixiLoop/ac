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
//import { useComments } from '../../providers/CommentProvider';
import { createPermissionChecker } from '../../lib/permission';

export type QuotationDto = {
  id: string;
  quoteNumber: string;
  status: string;
  priceLevel: string;
  quotationDate?: string;
  expiryDate?: string;
  createdAt: string;
  hasPremium: boolean;
  hasEssential: boolean;
  hasOngoing: boolean;
  customer?: {
    name: string;
  };
  salesOrderId?: string;
};

export default function QuotationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions, isSystem } = useAuth();
  //const { setContext } = useComments();

  const { has } = createPermissionChecker(permissions, isSystem);

  const canCreate = has('quotations.create');
  const canEdit = has('quotations.edit');
  const canView = has('quotations.view');
  const canDelete = has('quotations.delete');

  const [rows, setRows] = useState<QuotationDto[]>([]);
  const [rawRows, setRawRows] = useState<QuotationDto[]>([]);
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

  // useEffect(() => {
  //   setContext(null);
  // }, [setContext]);

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
      const res = await api.get('/quotations', {
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
      showToast({
        type: 'error',
        title: 'Failed to load quotations',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRaw = async () => {
    try {
      const res = await api.get('/quotations', {
        params: { take: 1000 },
      });

      const payload = res.data?.data ?? res.data;
      setRawRows(payload.items ?? []);
    } catch { }
  };

  const buildOptions = (values: (string | undefined | null)[]) =>
    Array.from(new Set(values.filter(Boolean)))
      .sort()
      .map(v => ({ label: v!, value: v! }));

  if (!canView) {
    return (
      <AdminShell title="Quotations">
        <p className="text-sm text-slate-600">
          You do not have permission.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Quotations" showTableDensity>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search quotations..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-[280px]"
          />

          {canCreate && (
            <Button onClick={() => router.push('/quotations/new')}>
              New Quotation
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
                  onEdit={row.salesOrderId ? undefined : canEdit ? () => router.push(`/quotations/${row.id}`) : undefined}
                  onDelete={async () => {
                    if (!confirm('Delete this quotation?')) return;
                    await api.delete(`/quotations/${row.id}`);
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