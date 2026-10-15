'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';
import { useAuth } from '../../../providers/auth-provider';
import DataTable, { ColumnDef } from '../../../components/common/DataTable';
import RowActions from '../../../components/common/RowActions';
import UserFormInline from '../../../components/users/UserFormInline';
import { createPermissionChecker } from '../../../lib/permission'

type RoleDto = { id: string; name: string };

export type UserDto = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  roles?: RoleDto[];
};

export default function UsersPage() {
  const { permissions, roles, isSystem  } = useAuth();
  console.log("AUTH USER:", useAuth());
  const { showToast } = useToast();
  console.log("isSystem===", isSystem)

  const { has } = createPermissionChecker(permissions, isSystem)
  const canCreate = has('fmcustomers.create')
  const canEdit = has('fmcustomers.edit')
  const canView = has('fmcustomers.view')
  const canDelete = has('fmcustomers.delete')

  const [users, setUsers] = useState<UserDto[]>([]);
  const [rawUsers, setRawUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [sort, setSort] = useState<{
    key: string | null;
    dir: 'asc' | 'desc' | null;
  }>({ key: null, dir: null });

  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');

  /* ---------- FORM STATE ---------- */

  const [editingUser, setEditingUser] =
    useState<UserDto | 'new' | null>(null);

  const [formMode, setFormMode] =
    useState<'create' | 'edit' | 'view'>('create');

  /* ================= DATA ================= */

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
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

      const payload = res.data?.data ?? res.data;
      setUsers(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to load users',
        message: 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load unfiltered data ONCE for dynamic filter options
  const loadUsersForFilters = async () => {
    const res = await api.get('/users', {
      params: { skip: 0, take: 1000 },
    });
    const payload = res.data?.data ?? res.data;
    setRawUsers(payload.items ?? []);
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, sort, filters, search]);

  useEffect(() => {
    loadUsersForFilters();
  }, []);

  /* ================= FILTER HELPERS ================= */

  const buildFilterOptions = (values: (string | null | undefined)[]) =>
    Array.from(new Set(values.filter(Boolean)))
      .sort()
      .map(v => ({ label: v!, value: v! }));

  const nameFilterOptions = () =>
    buildFilterOptions(
      rawUsers.map(
        u =>
          u.displayName ||
          [u.firstName, u.lastName].filter(Boolean).join(' ')
      )
    );

  const emailFilterOptions = () =>
    buildFilterOptions(rawUsers.map(u => u.email));

  const roleFilterOptions = () =>
    buildFilterOptions(
      rawUsers.flatMap(u => u.roles?.map(r => r.name) ?? [])
    );

  const statusFilterOptions = () =>
    buildFilterOptions(
      rawUsers.map(u => (u.isActive ? 'Active' : 'Inactive'))
    );

  const lastLoginFilterOptions = () =>
    buildFilterOptions(
      rawUsers
        .filter(u => u.lastLoginAt)
        .map(u =>
          new Date(u.lastLoginAt!).toLocaleDateString()
        )
    );

  /* ================= COLUMNS ================= */

  const columns: ColumnDef<UserDto>[] = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: nameFilterOptions(),
      render: u =>
        u.displayName ||
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        '—',
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: emailFilterOptions(),
      render: u => (
        <span className="text-slate-600">{u.email}</span>
      ),
    },
    {
      key: 'roles',
      title: 'Roles',
      filterable: true,
      filterType: 'multi',
      filterOptions: roleFilterOptions(),
      render: u => u.roles?.map(r => r.name).join(', ') ?? '—',
    },
    {
      key: 'status',
      title: 'Status',
      filterable: true,
      filterType: 'multi',
      filterOptions: statusFilterOptions(),
      render: u => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
            u.isActive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {u.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      title: 'Last login',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: lastLoginFilterOptions(),
      render: u =>
        u.lastLoginAt
          ? new Date(u.lastLoginAt).toLocaleString()
          : '—',
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: u => (
        <RowActions
          onView={
            canView
              ? () => {
                  setEditingUser(u);
                  setFormMode('view');
                }
              : undefined
          }
          onEdit={
            canEdit
              ? () => {
                  setEditingUser(u);
                  setFormMode('edit');
                }
              : undefined
          }
          onDelete={
            canDelete
              ? async () => {
                  if (!confirm('Delete this user?')) return;
                   try {
                    await api.delete(`/users/${u.id}`);

                    showToast({
                      type: 'success',
                      title: 'User deleted',
                      message: 'The user has been deleted successfully.',
                    });
                    
                    loadUsers();
                    loadUsersForFilters();
                  } catch (err: any) {
                    const errorMessage =
                      err?.response?.data?.message?.message ||
                      err?.response?.data?.message ||
                      'Unable to delete this user.';

                    showToast({
                      type: 'error',
                      title: 'Action blocked',
                      message: errorMessage,
                    });
                  }
                }
              : undefined
          }
        />
      ),
    },
  ];

  /* ================= RENDER ================= */

  return (
    <AdminShell title="Users" subtitle="User management" showTableDensity>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[280px]"
          />
          {canCreate && (
            <Button
              onClick={() => {
                setEditingUser('new');
                setFormMode('create');
              }}
            >
              New user
            </Button>
          )}
        </div>

        {editingUser && (
          <UserFormInline
            user={editingUser === 'new' ? null : editingUser}
            mode={formMode}
            onCancel={() => setEditingUser(null)}
            onSaved={() => {
              setEditingUser(null);
              loadUsers();
              loadUsersForFilters();
            }}
          />
        )}

        <DataTable
          data={users}
          columns={columns}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort} 
          onFilterChange={setFilters}
          showRowsPerPage
          showPaginationArrows
        />
      </div>
    </AdminShell>
  );
}
