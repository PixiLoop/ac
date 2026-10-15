'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import DataTable from '../../../components/common/DataTable';
import RowActions from '../../../components/common/RowActions';
import { useAuth } from '../../../providers/auth-provider';
import { createPermissionChecker } from '../../../lib/permission';






interface DispatchItem {
  id: string;
  dispatchNumber: string;
  customerId: string;
  dispatchDate: string;
  dispatchMethod: string;
  conNote: string;
  freightCost: string;
  freightCharge: string;
  salesPerson: string;
  shippingAddress: string;
  totalCost: string;
  DispatchedInvoices: Array<{
    id: string;
    dispatchId: string;
    invoiceId: string;
    dispatchCode: string;
    Invoice: {
      id: string;
      invoiceNumber: string;
    };
    DispatchMethod: {
      id: string;
      code: string;
      label: string;
      isActive: boolean;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

export default function DispatchMethodsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('dispatches.view');
  const canCreate = has('dispatches.create');
  const canEdit = has('dispatches.edit');
  const canDelete = has('dispatches.delete');

  const [rows, setRows] = useState<DispatchItem[]>([]);
  const [rawRows, setRawRows] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({ key: 'dispatchDate', dir: 'desc' });
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  // Deletion Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteNumber, setDeleteNumber] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, [page, pageSize, sort, search, filters]);

  useEffect(() => {
    loadRaw();
  }, []);

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await api.get('/dispatch', {
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
      if (Array.isArray(payload)) {
        setRows(payload);
        setTotal(payload.length);
      } else {
        setRows(payload?.items ?? []);
        setTotal(payload?.total ?? 0);
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to load dispatches' });
    } finally {
      setLoading(false);
    }
  };

  const loadRaw = async () => {
    if (!canView) return;
    try {
      const res = await api.get('/dispatch', { params: { take: 1000 } });
      const payload = res.data?.data ?? res.data;
      setRawRows(Array.isArray(payload) ? payload : payload?.items ?? []);
    } catch {}
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/dispatch/${deleteId}`);
      showToast({ type: 'success', title: 'Dispatch deleted successfully' });
      setDeleteId(null);
      setDeleteNumber('');
      load();
      loadRaw();
    } catch (error: any) {
      const apiError = error?.response?.data?.message || 'Failed to delete dispatch';
      showToast({ type: 'error', title: 'Error deleting dispatch', message: apiError });
    } finally {
      setDeleting(false);
    }
  };

  const buildOptions = (values: (string | undefined | null)[]) =>
    Array.from(new Set(values.filter(Boolean))).sort().map(v => ({ label: v!, value: v! }));

  if (!canView && !canCreate) {
    return (
      <AdminShell title="Dispatches">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Dispatches" showTableDensity>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search dispatch..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-[280px]"
          />
          {canCreate && (
            <Button onClick={() => router.push('/admin/dispatches/new')}>
              Add Dispatch
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
              key: 'dispatchNumber',
              title: 'Dispatch No.',
              sortable: true,
              filterable: true,
              filterType: 'multi',
              filterOptions: buildOptions(rawRows.map(r => r.dispatchNumber)),
            },
            {
              key: 'dispatchDate',
              title: 'Date',
              sortable: true,
              render: row =>
                row.dispatchDate
                  ? new Date(row.dispatchDate).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—',
            },
            {
              key: 'invoices',
              title: 'Invoices',
              render: row => (
                <div className="flex flex-wrap gap-1 max-w-[180px]">
                  {row.DispatchedInvoices && row.DispatchedInvoices.length > 0 ? (
                    row.DispatchedInvoices.map(inv => (
                      <span
                        key={inv.Invoice.id}
                        className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-mono truncate max-w-[140px]"
                        title={inv.Invoice.invoiceNumber}
                      >
                        {inv.Invoice.invoiceNumber}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </div>
              ),
            },
            {
              key: 'dispatchMethod',
              title: 'Dispatch Method',
              render: row => {
                const methods = row.DispatchedInvoices?.map(i => i.DispatchMethod?.label).filter(Boolean);
                return methods && methods.length > 0 ? (
                  <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                    {methods.join(', ')}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">—</span>
                );
              },
            },
            {
              key: 'conNote',
              title: 'Con Note',
              filterable: true,
              filterType: 'multi',
              filterOptions: buildOptions(rawRows.map(r => r.conNote)),
              render: row =>
                row.conNote ? (
                  <span className="font-mono text-xs">{row.conNote}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                ),
            },
            {
              key: 'shippingAddress',
              title: 'Shipping Address',
              render: row => (
                <p className="whitespace-pre-line line-clamp-2 text-xs max-w-[220px]" title={row.shippingAddress}>
                  {row.shippingAddress || '—'}
                </p>
              ),
            },
            {
              key: 'totalCost',
              title: 'Total Cost',
              sortable: true,
              render: row =>
                row.totalCost != null ? `$${Number(row.totalCost).toFixed(2)}` : '—',
            },
            {
              key: 'actions',
              title: 'Actions',
              render: row => (
                <RowActions
                  onView={() => router.push(`/admin/dispatches/${row.id}/view`)}
                  onEdit={canEdit ? () => router.push(`/admin/dispatches/${row.id}`) : undefined}
                  onDelete={
                    canDelete
                      ? () => {
                          setDeleteId(row.id);
                          setDeleteNumber(row.dispatchNumber);
                        }
                      : undefined
                  }
                />
              ),
            },
          ]}
        />
      </div>

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete dispatch{' '}
              <span className="font-mono font-semibold text-slate-800">{deleteNumber || deleteId}</span>? This operation cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={() => {
                  setDeleteId(null);
                  setDeleteNumber('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleting}
                onClick={handleDeleteConfirm}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}