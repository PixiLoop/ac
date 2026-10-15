'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import DataTable, { type SortState } from '../common/DataTable';
import RowActions from '../common/RowActions';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

export function CategoryList() {
  const router = useRouter();
  const { showToast } = useToast();

  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('inventory.view');
  const canCreate = has('inventory.create');
  const canDelete = has('inventory.delete');
  const canEdit = has('inventory.edit');

  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState<SortState>({ key: 'name', dir: 'asc' });

  const load = React.useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        take: String(pageSize),
        ...(search && { search }),
        ...(sort.key && { sortKey: sort.key, sortDir: sort.dir }),
      });
      const res = await api.get(`/inventory/categories?${params}`);
      const data = res.data?.data ?? res.data;
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      showToast({ type: 'error', title: 'Failed to load categories' });
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize, sort]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/inventory/categories/${id}`);
      showToast({ type: 'success', title: 'Category deleted' });
      load();
    } catch {
      showToast({ type: 'error', title: 'Failed to delete category' });
    }
  }

  if (!canView && !canCreate) {
    return <p className="text-sm text-slate-600">You do not have permission.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search code or name..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setSearch(''); setPage(1); }}>Clear</Button>
          {canCreate && (
            <Button onClick={() => router.push('/inventory/categories/new')}>Add Category</Button>
          )}
        </div>
      </div>

      <DataTable
        data={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        onSortChange={setSort}
        columns={[
          { key: 'code', title: 'Code', sortable: true },
          { key: 'name', title: 'Name', sortable: true },
          { key: 'description', title: 'Description', render: (row) => row.description ?? '—' },
          {
            key: 'isActive',
            title: 'Status',
            render: (row) => (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {row.isActive ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'actions',
            title: 'Action',
            render: (row) => (
              <RowActions
                onEdit={canEdit ? () => router.push(`/inventory/categories/${row.id}`) : undefined}
                onDelete={canDelete ? () => handleDelete(row.id) : undefined}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
