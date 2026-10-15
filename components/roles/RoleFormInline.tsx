'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Textarea } from '../../components/ui/TextareaField';
import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';

/* ================= TYPES ================= */

type PermissionDto = {
  id: string;
  name: string;
  description?: string | null;
};

type RoleDto = {
  id: string;
  name: string;
  description?: string | null;
  isTechnician?: boolean;
  permissions: PermissionDto[];
};

/* ================= COMPONENT ================= */

export default function RoleFormInline({
  role,
  mode,
  onCancel,
  onSaved,
}: {
  role: RoleDto | null;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();

  /* ---------- STATE ---------- */
  const [isTechnician, setIsTechnician] = useState(false);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [permIds, setPermIds] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [searchPerm, setSearchPerm] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement | null>(null);

  /* ================= LOAD DATA ================= */
console.log(role, "roleeeeeeeeeeeeeeeeeeeeeeee");

  useEffect(() => {
    if (mode === 'create') {
      setName('');
      setDesc('');
      setIsTechnician(false);
      setPermIds([]);
      setTimeout(() => nameRef.current?.focus(), 50);
    } else if (role) {
      setName(role.name ?? '');
      setDesc(role.description ?? '');
      setIsTechnician(Boolean(role.isTechnician)); // <--- Set state from role
      setPermIds(role.permissions.map(p => p.id));
    }

    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mode]);

  const loadPermissions = async () => {
    setPermLoading(true);
    try {
      const res = await api.get('/roles/permissions');
      const data = res.data?.data ?? res.data;
      setPermissions(data ?? []);
    } catch {
      showToast({
        type: 'error',
        title: 'Unable to load permissions',
        message: 'Please try again later.',
      });
    } finally {
      setPermLoading(false);
    }
  };

  /* ================= PERMISSION GROUPING ================= */

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionDto[]>>((acc, p) => {
      if (
        searchPerm &&
        !p.name.toLowerCase().includes(searchPerm.toLowerCase())
      ) {
        return acc;
      }

      const group = p.name.split('.')[0];
      acc[group] = acc[group] || [];
      acc[group].push(p);
      return acc;
    }, {});
  }, [permissions, searchPerm]);

  const togglePermission = (id: string) => {
    setPermIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleGroup = (groupPerms: PermissionDto[]) => {
    const ids = groupPerms.map(p => p.id);
    const allSelected = ids.every(id => permIds.includes(id));

    setPermIds(prev =>
      allSelected
        ? prev.filter(id => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids]))
    );
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: desc.trim() || undefined,
        isTechnician,
        permissionIds: permIds,
      };

      if (!role) {
        await api.post('/roles', payload);
        showToast({ type: 'success', title: 'Role created' });
      } else {
        await api.patch(`/roles/${role.id}`, payload);
        showToast({ type: 'success', title: 'Role updated' });
      }

      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ---------- HEADER ---------- */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {mode === 'create'
                ? 'Create role'
                : mode === 'edit'
                  ? 'Edit role'
                  : 'View role'}
            </h3>
            <p className="text-sm text-slate-500">
              Define role details and permissions
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Close
            </Button>
            {mode !== 'view' && (
              <Button type="submit" loading={saving}>
                Save
              </Button>
            )}
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* ---------- MAIN GRID ---------- */}
        <div className="grid gap-8 md:grid-cols-12">
          {/* LEFT — ROLE DETAILS */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <Label>Role name</Label>
              <Input
                ref={nameRef}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Admin"
                readOnly={mode === 'view'}
              />
            </div>

            <Textarea
              label="Description"
              value={desc}
              onChange={setDesc}
              placeholder="Describe what this role is responsible for"
              maxLength={250}
              readOnly={mode === 'view'}
            />

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isTechnician}
                disabled={mode === 'view'}
                onChange={e => setIsTechnician(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Is technician
              </span>
            </label>
          </div>

          {/* RIGHT — PERMISSIONS */}
          <div className="md:col-span-7">
            <Label>Permissions</Label>

            <Input
              placeholder="Search permissions..."
              value={searchPerm}
              onChange={e => setSearchPerm(e.target.value)}
              className="mt-2 mb-3"
            />

            <div className="max-h-[420px] overflow-auto space-y-5 pr-2">
              {permLoading && (
                <div className="text-sm text-slate-500">
                  Loading permissions…
                </div>
              )}

              {!permLoading &&
                Object.entries(groupedPermissions).map(
                  ([group, perms]) => {
                    const allSelected = perms.every(p =>
                      permIds.includes(p.id)
                    );

                    return (
                      <div key={group}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-semibold uppercase text-slate-500">
                            {group}
                          </div>

                          {mode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => toggleGroup(perms)}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              {allSelected ? 'Clear' : 'Select all'}
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          {perms.map(p => {
                            const checked = permIds.includes(p.id);

                            return (
                              <label
                                key={p.id}
                                className={cn(
                                  'flex items-center gap-3 rounded-md px-3 py-2',
                                  'border border-slate-200 hover:bg-slate-50',
                                  checked &&
                                  'bg-indigo-50 border-indigo-400',
                                  mode === 'view' &&
                                  'cursor-default opacity-80'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={mode === 'view'}
                                  onChange={() =>
                                    togglePermission(p.id)
                                  }
                                  className="h-4 w-4 accent-indigo-600"
                                />
                                <span className="text-sm">
                                  {p.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
