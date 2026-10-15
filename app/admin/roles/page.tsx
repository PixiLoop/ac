'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import DataTable, { ColumnDef } from '../../../components/common/DataTable';
import RowActions from '../../../components/common/RowActions';
import RoleFormInline from '../../../components/roles/RoleFormInline';
import { useSearchParams, useRouter } from 'next/navigation';

import { PermissionGate } from '../../../components/rbac/PermissionGate';
import { useAuth } from '../../../providers/auth-provider';
import { createPermissionChecker } from '../../../lib/permission'
import { Badge } from 'lucide-react';
//import { useRequirePermission } from '../../../hooks/useRequirePermission';
//import { useHasPermission } from '../../../hooks/useHasPermission';

type RoleDto = {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  isTechnician?: boolean; // <--- Add this field
  createdAt?: string;
  permissions: { id: string; name: string }[];
  assignedCount?: number;
};

export default function RolesPage() {
  //useRequirePermission('roles.view');

  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // const canEdit = useHasPermission('roles.edit');
  // const canDelete = useHasPermission('roles.delete');
  // const canView = useHasPermission('roles.view');

  const { permissions, loading, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);
  const canView = has('roles.view');
  const canEdit = has('roles.edit');
  const canDelete = has('roles.delete');
  const canCreate = has('roles.create');

  // const canView = permissions.includes('roles.view');
  // const canEdit = permissions.includes('roles.edit');
  // const canDelete = permissions.includes('roles.delete');
  // const canCreate = permissions.includes('roles.create');

  const q = searchParams.get('q') ?? '';

  /* ---------- TABLE STATE ---------- */

  const [roles, setRoles] = useState<RoleDto[]>([]);        // filtered rows
  const [rawRoles, setRawRoles] = useState<RoleDto[]>([]); // unfiltered rows

  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({
    key: null,
    dir: null,
  });

  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const [editingRole, setEditingRole] =
    useState<RoleDto | null>(null);
  const [formMode, setFormMode] =
    useState<'create' | 'edit' | 'view'>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const baseQueryKey = useMemo(
    () => JSON.stringify({ q, page, pageSize, sort }),
    [q, page, pageSize, sort]
  );

  //RAW DATA (no filters)
  const loadRawRoles = async () => {
    const res = await api.get('/roles', {
      params: {
        search: q || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
        sortKey: sort.key ?? undefined,
        sortDir: sort.dir ?? undefined,
      },
    });

    const payload = res.data?.data ?? res.data;
    setRawRoles(payload.items ?? []);
  };

  const loadRoles = async () => {
    setTableLoading(true);
    try {
      const res = await api.get('/roles', {
        params: {
          search: q || undefined,
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

      const payload = res.data?.data ?? res.data;
      setRoles(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        return;
      }

      showToast({
        type: 'error',
        title: 'Unable to load roles',
        message: 'Something went wrong while loading roles.',
      });

    } finally {
      setTableLoading(false);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRole(null);
    setFormMode('create'); // reset default
  };

  useEffect(() => {
    if (!canView) return;
    loadRawRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, baseQueryKey]);

  useEffect(() => {
    if (!canView) return;
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, page, pageSize, sort, filters, q]);

  function columnValuesForRoles(data: RoleDto[], key: 'name' | 'description' | 'createdAt') {
    const set = new Set<string>();

    for (const r of data) {
      if (key === 'name') set.add(r.name);
      if (key === 'description' && r.description) set.add(r.description);
      if (key === 'createdAt' && r.createdAt) {
        set.add(new Date(r.createdAt).toLocaleDateString());
      }
    }

    return Array.from(set).sort();
  }

  const roleNameOptions = useMemo(
    () =>
      columnValuesForRoles(rawRoles, 'name').map(v => ({
        label: v,
        value: v,
      })),
    [rawRoles]
  );

  // const createdDateOptions = useMemo(
  //   () =>
  //     columnValuesForRoles(rawRoles, 'createdAt').map(v => ({
  //       label: v,
  //       value: v,
  //     })),
  //   [rawRoles]
  // );

  const createdDateOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const r of rawRoles) {
      if (!r.createdAt) continue;

      const iso = r.createdAt.slice(0, 10); // YYYY-MM-DD
      const label = new Date(r.createdAt).toLocaleDateString();

      map.set(iso, label);
    }

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rawRoles]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role?')) return;

    try {
      await api.delete(`/roles/${id}`);
      showToast({ type: 'success', title: 'Deleted', message: '' });
      loadRoles();
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Unable to delete the selected role.';

      showToast({
        type: 'error',
        title: 'Delete failed',
        message: backendMessage,
      });
    }
  };
  const columns: ColumnDef<RoleDto>[] = [
    {
      key: 'name',
      title: 'Role',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: roleNameOptions,
    },
    {
      key: 'description',
      title: 'Description',
      filterable: true,
    },
    {
      key: 'permissions',
      title: 'Permissions',
      render: r => r.permissions.map(p => p.name).join(', '),
    },
    {
      key: 'isSystem',
      title: 'System',
      sortable: true,

      render: (r: any) => (r.isSystem ? 'Yes' : 'No'),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: createdDateOptions,
      render: r =>
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: r => (

        <RowActions
          onView={
            canView
              ? () => {
                setEditingRole(r);
                setFormMode('view');
                setIsFormOpen(true);
              }
              : undefined
          }
          onEdit={
            canEdit && !r.isSystem
              ? () => {
                setEditingRole(r);
                setFormMode('edit');
                setIsFormOpen(true);
              }
              : undefined
          }

          onDelete={
            canDelete && !r.isSystem
              ? () => handleDelete(r.id)
              : undefined
          }
          disableDelete={r.isSystem}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <AdminShell title="Roles">
        <div className="p-6 text-sm text-slate-500">
          Loading…
        </div>
      </AdminShell>
    );
  }

  if (!canView) {
    return (
      <AdminShell title="Roles">
        <div className="p-6 text-sm text-slate-600">
          You do not have permission to view this page.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Roles" subtitle="Role definitions" showTableDensity>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search roles..."
            value={q}
            onChange={(e) =>
              router.replace(`/admin/roles?q=${e.target.value}`)
            }
            className="h-8 w-[290px] text-sm"
          />

          {/* <PermissionGate permission="roles.create">
            <Button onClick={() => setEditingRole('new')}>
              Create role
            </Button>
          </PermissionGate> */}

          {canCreate && (
            <Button
              onClick={() => {
                setEditingRole(null);
                setFormMode('create');
                setIsFormOpen(true);
              }}
            >
              Create Role
            </Button>
          )}

        </div>

        {/* {(formMode === 'create' || editingRole) && (
          <RoleFormInline
            role={formMode === 'create' ? null : editingRole}
            mode={formMode}
            onCancel={() => {
              setEditingRole(null);
              setFormMode('create');
            }}
            onSaved={() => {
              setEditingRole(null);
              setFormMode('create');
              loadRoles();
            }}
          />
        )} */}

        {isFormOpen && (
          <RoleFormInline
            role={formMode === 'create' ? null : editingRole}
            mode={formMode}
            onCancel={closeForm}
            onSaved={() => {
              closeForm();
              loadRoles();
            }}
          />
        )}

        <DataTable
          data={roles}
          columns={columns}
          loading={tableLoading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          onSortChange={setSort}
          onFilterChange={setFilters}
          showRowsPerPage
          showPaginationArrows
        />
      </div>
    </AdminShell>
  );
}
