'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/toast';

import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';

import DataTable from '../../components/common/DataTable';
import RowActions from '../../components/common/RowActions';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission'

export default function CustomersListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions, isSystem } = useAuth();

  const [rows, setRows] = useState<any[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const { has } = createPermissionChecker(permissions, isSystem)

  const canCreate = has('customers.create')
  const canEdit = has('customers.edit')
  const canView = has('customers.view')
  const canDelete = has('customers.delete')

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<{
    key: string | null;
    dir: 'asc' | 'desc' | null;
  }>({
    key: 'createdAt',
    dir: 'desc',
  });


  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: {
          search: search || undefined,
          skip: (page - 1) * pageSize,
          take: pageSize,
          sortKey: sort.key ?? undefined,
          sortDir: sort.dir ?? undefined,
          ...Object.fromEntries(
            Object.entries(filters)
              .filter(([, v]) => v?.length)
              .map(([k, v]) => [`filter_${k}`, v.join(',')])
          ),
        },
      });

      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load customers',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRawCustomers = async () => {
    try {
      const res = await api.get('/customers', {
        params: {
          skip: 0,
          take: 1000,
        },
      });

      setRawRows(res.data.data || []);
    } catch {
      // silent fail – filters just won’t show values
    }
  };

  /* ================= EFFECTS ================= */

  useEffect(() => {
    load();
  }, [search, status, page, pageSize, sort, filters]);

  useEffect(() => {
    loadRawCustomers();
  }, []);

  const buildFilterOptions = (values: (string | null | undefined)[]) =>
    Array.from(new Set(values.filter(Boolean)))
      .sort()
      .map(v => ({ label: v!, value: v! }));

  const nameFilterOptions = () =>
    buildFilterOptions(rawRows.map(r => r.name));

  const customerNumberFilterOptions = () =>
    buildFilterOptions(rawRows.map(r => r.customerNumber));

  const registeredNameFilterOptions = () =>
    buildFilterOptions(rawRows.map(r => r.registeredName));

  const abnFilterOptions = () =>
    buildFilterOptions(rawRows.map(r => r.abn));

  const fmFilterOptions = () =>
    buildFilterOptions(rawRows.map(r => r.fmCustomerNumber));

  if (!canView) {
    return (
      <AdminShell title="Customers">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Customers" showTableDensity>
      {/* FILTER BAR */}
      <div className="mb-4 flex flex-wrap items-end gap-3">

        <Input
          placeholder="Search by name, email, ABN"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {canCreate && (
          <div className="ml-auto">
            <Button onClick={() => router.push('/customers/new')}>
              Add Customer
            </Button>
          </div>
        )}
      </div>

      {/* TABLE */}
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
            key: 'customerNumber',
            title: 'Customer Number',
            sortable: true,
            filterable: true,
            filterType: 'multi',
            filterOptions: customerNumberFilterOptions(),
          },
          {
            key: 'name',
            title: 'Customer Name',
            sortable: true,
            filterable: true,
            filterType: 'multi',
            filterOptions: nameFilterOptions(),
          },
          {
            key: 'registeredName',
            title: 'Registered Name',
            sortable: true,
            filterable: true,
            filterType: 'multi',
            filterOptions: registeredNameFilterOptions(),
          },
          {
            key: 'abn',
            title: 'ABN',
            sortable: true,
            filterable: true,
            filterType: 'multi',
            filterOptions: abnFilterOptions(),
          },
          {
            key: 'fmCustomerNumber',
            title: 'FM No.',
            sortable: true,
            filterable: true,
            filterType: 'multi',
            filterOptions: fmFilterOptions(),
          },
          {
            key: 'status',
            title: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'multi',
            filterOptions: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
              { label: 'On Hold', value: 'ON_HOLD' },
            ],










            
            render: (row) => (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${row.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : row.status === 'ON_HOLD'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {row.status}
              </span>
            ),
          },
          {
            key: 'createdAt',
            title: 'Created',
            sortable: true,
            render: (row) =>
              new Date(row.createdAt).toLocaleDateString(),
          },
          {
            key: 'actions',
            title: 'Actions',
            render: (row) => (
              <RowActions
                onView={() => router.push(`/customers/${row.id}/view`)}
                onEdit={() => router.push(`/customers/${row.id}`)}
                onDelete={async () => {
                  if (!confirm('Delete this customer and ALL related data?')) return;

                  try {
                    await api.delete(`/customers/${row.id}`);
                    showToast({
                      type: 'success',
                      title: 'Customer deleted',
                    });
                    load();
                    loadRawCustomers();
                  } catch (err: any) {
                    showToast({
                      type: 'error',
                      title: 'Delete failed',
                      message:
                        err?.response?.data?.message?.message ||
                        'Unable to delete customer.',
                    });
                  }
                }}
              />
            ),
          },
        ]}
      />
    </AdminShell>
  );
}
