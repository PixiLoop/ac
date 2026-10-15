import React, { useEffect, useState } from 'react';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { api } from '../../lib/api-client';

type PermissionDto = { id: string; name: string; description?: string | null; };
type RoleDto = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  permissions: PermissionDto[];
  userCount?: number;
};

export default function RoleForm({
  editId,
  role,
  permissions,
  permLoading,
  onCancel,
  onSaved,
}: {
  editId: string | null;
  role: RoleDto | null;
  permissions: PermissionDto[];
  permLoading: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permIds, setPermIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId && editId !== 'new' && role) {
      setName(role.name ?? '');
      setDescription(role.description ?? '');
      setPermIds((role.permissions ?? []).map(p => p.id));
    } else {
      setName('');
      setDescription('');
      setPermIds([]);
    }
  }, [editId, role]);

  const togglePermissionId = (id: string) => {
    setPermIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) { setError('Role name is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, permissionIds: permIds };
      if (editId === 'new') {
        await api.post('/roles', payload);
      } else {
        await api.patch(`/roles/${editId}`, payload);
      }
      onSaved();
    } catch (err: any) {
      console.error('Role save failed', err);
      const data = err?.response?.data;
      let msg = 'Unable to save role.';
      if (data?.message) msg = typeof data.message === 'string' ? data.message : (data.message.message ?? msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">{editId === 'new' ? 'Create role' : 'Edit role'}</h3>
          <p className="text-sm text-slate-500">Add a role name, description, and assign permissions.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" loading={saving}>Save role</Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="roleName">Role name</Label>
          <Input id="roleName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Admin" />
        </div>

        <div className="space-y-1">
          <Label>Created</Label>
          <div className="text-sm text-slate-500">{editId === 'new' ? '—' : (role?.createdAt ? new Date(role.createdAt).toLocaleString() : '—')}</div>
        </div>

        <div className="md:col-span-3">
          <Label htmlFor="roleDesc">Description</Label>
          <Input id="roleDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>

        <div className="md:col-span-3">
          <Label>Permissions</Label>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {permLoading && <div className="text-sm text-slate-500">Loading permissions…</div>}
            {!permLoading && permissions.length === 0 && <div className="text-sm text-slate-500">No permissions available</div>}

            {!permLoading && permissions.map(p => (
              <label key={p.id} className="inline-flex items-center gap-2 rounded-md border border-slate-100 px-2 py-1">
                <input type="checkbox" checked={permIds.includes(p.id)} onChange={() => togglePermissionId(p.id)} className="h-4 w-4" />
                <div className="text-sm">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  {p.description && <div className="text-[11px] text-slate-500">{p.description}</div>}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
