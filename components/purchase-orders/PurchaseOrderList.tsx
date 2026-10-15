'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { useToast } from '../ui/toast';
import DataTable, { type SortState } from '../common/DataTable';

type PoStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

const STATUS_BADGE: Record<PoStatus, string> = {
  DRAFT:              'bg-slate-100 text-slate-600',
  SUBMITTED:          'bg-blue-50 text-blue-700',
  PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700',
  RECEIVED:           'bg-emerald-50 text-emerald-700',
  CANCELLED:          'bg-red-50 text-red-700',
};

export function PurchaseOrderList() {
  const router        = useRouter();
  const { showToast } = useToast();

  const [rows,     setRows]     = React.useState<any[]>([]);
  const [total,    setTotal]    = React.useState(0);
  const [loading,  setLoading]  = React.useState(false);
  const [search,   setSearch]   = React.useState('');
  const [status,   setStatus]   = React.useState('');
  const [page,     setPage]     = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const load = React.useCallback(() => {
    setLoading(true);
    api.get('/inventory/purchase-orders', {
      params: {
        skip:   (page - 1) * pageSize,
        take:   pageSize,
        ...(status && { status }),
      },
    }).then((res) => {
      const data = res.data?.data ?? res.data;
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
    }).catch(() => showToast({ type: 'error', title: 'Failed to load purchase orders' }))
      .finally(() => setLoading(false));
  }, [page, pageSize, status]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select
            value={status}
            options={[
              { label: 'All statuses', value: '' },
              { label: 'Draft',             value: 'DRAFT' },
              { label: 'Submitted',         value: 'SUBMITTED' },
              { label: 'Partially Received',value: 'PARTIALLY_RECEIVED' },
              { label: 'Received',          value: 'RECEIVED' },
              { label: 'Cancelled',         value: 'CANCELLED' },
            ]}
            onChange={(v) => { setStatus(v); setPage(1); }}
            className="w-44"
          />
        </div>
        <Button onClick={() => router.push('/inventory/purchase-orders/new')}>
          + New Purchase Order
        </Button>
      </div>

      <DataTable
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        columns={[
          {
            key: 'orderNumber',
            title: 'PO Number',
            render: (row) => (
              <span className="font-mono text-sm font-medium">{row.orderNumber}</span>
            ),
          },
          {
            key: 'supplier',
            title: 'Supplier',
            render: (row) => (
              <div>
                <p className="text-sm font-medium">{row.supplier?.name}</p>
                <p className="text-xs text-slate-400">{row.supplier?.code}</p>
              </div>
            ),
          },
          {
            key: 'status',
            title: 'Status',
            render: (row) => (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[row.status as PoStatus] ?? ''}`}>
                {row.status?.replace('_', ' ')}
              </span>
            ),
          },
          {
            key: 'expectedDate',
            title: 'Expected',
            render: (row) => row.expectedDate
              ? new Date(row.expectedDate).toLocaleDateString('en-AU')
              : '—',
          },
          {
            key: 'total',
            title: 'Total',
            align: 'right',
            render: (row) => row.total != null
              ? `$${Number(row.total).toFixed(2)}`
              : '—',
          },
          {
            key: 'lines',
            title: 'Lines',
            align: 'right',
            render: (row) => row._count?.lines ?? '—',
          },
          {
            key: 'createdAt',
            title: 'Created',
            render: (row) => new Date(row.createdAt).toLocaleDateString('en-AU'),
          },
          {
            key: 'actions',
            title: '',
            render: (row) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/inventory/purchase-orders/${row.id}`)}
              >
                Open
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
