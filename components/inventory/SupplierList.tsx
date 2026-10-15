'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import DataTable, { type SortState } from '../common/DataTable';
import RowActions from '../common/RowActions';
import { SupplierStatusBadge } from './shared-ui';

const reports = [
  'Inventory Valuation Report',
  'Stock on Hand by Location',
  'Reorder / Below Minimum Report',
  'Back Order Report',
  'Supplier Purchase History',
  'Supplier Order Outstanding Report',
  'Stock Movement Ledger',
  'Stock Recount Variance Report',
  'Price Matrix Audit Report',
  'Sales by Item / Group / Supplier',
  'FM Service Hardware Item Report',
  'BOG Component Usage Report',
];

export function SupplierList() {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState<SortState>({ key: 'name', dir: 'asc' });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        take: String(pageSize),
        ...(search && { search }),
        ...(sort.key && { sortKey: sort.key, sortDir: sort.dir }),
      });
      const res = await api.get(`/inventory/suppliers?${params}`);
      const data = res.data?.data ?? res.data;
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      showToast({ type: 'error', title: 'Failed to load suppliers' });
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize, sort]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Debounce search — reset to page 1
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    clearTimeout(searchTimeout.current);
  };

  return (
    <div className="space-y-6">
      {/* ── Supplier list ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search supplier, code, suburb..."
            className="w-[280px]"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Button onClick={() => router.push('/inventory/suppliers/new')}>Add Supplier</Button>
        </div>

        <DataTable
          data={rows}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          initialSort={sort}
          onSortChange={setSort}
          columns={[
            { key: 'code', title: 'Code', sortable: true },
            { key: 'name', title: 'Name', sortable: true },
            { key: 'repContactName', title: 'Contact' },
            { key: 'repContactPhone', title: 'Phone' },
            { key: 'repContactEmail', title: 'Email' },
            { key: 'paymentMethod', title: 'Payment Method' },
            {
              key: 'status',
              title: 'Status',
              render: (row) => <SupplierStatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              title: 'Action',
              render: (row) => (
                <div className="flex items-center gap-1">
                  <RowActions
                    onView={() => router.push(`/inventory/suppliers/${row.id}/view`)}
                    onEdit={() => router.push(`/inventory/suppliers/${row.id}`)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => router.push(`/inventory/purchase-orders/new?supplierId=${row.id}`)}
                  >
                    + PO
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Reports ── */}
      {/* <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Reports</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {reports.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div>
                <div className="text-[12px] font-medium text-slate-800">{name}</div>
                <div className="text-[11px] text-muted-foreground">Preview / export / schedule</div>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}
