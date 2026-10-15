'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/toast';

export default function RoleForm({ role, permissions = [], onCancel, onSaved }: any) {
  const { showToast } = useToast();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<string[]>(() => (role?.permissions ?? []).map((p:any) => p.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setSelected((role?.permissions ?? []).map((p:any) => p.id));
  }, [role]);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x)=> x !== id) : [...s, id]));
  };

  const selectAll = () => setSelected(permissions.map((p:any) => p.id));
  const clearAll = () => setSelected([]);

  const submit = async (e?: any) => {
    if (e) e.preventDefault();
    if (!name.trim()) { setError('Role name required'); return; }
    setSaving(true); setError(null);

    try {
      if (role?.id) {
        await api.patch(`/roles/${role.id}`, { name: name.trim(), description: description.trim() || null, permissionIds: selected });
      } else {
        await api.post('/roles', { name: name.trim(), description: description.trim() || null, permissionIds: selected });
      }
      onSaved?.();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Save failed');
      showToast({ type: 'error', title: 'Save failed', message: err?.message ?? '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl border border-slate-200 p-6 w-full max-w-2xl z-10">
        <h2 className="text-lg font-semibold mb-2">{role?.id ? 'Edit role' : 'Create role'}</h2>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">Role name</Label>
            <Input id="name" value={name} onChange={(e)=> setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={description} onChange={(e)=> setDescription(e.target.value)} />
          </div>

          <div>
            <Label>Permissions</Label>
            <div className="mb-2 flex items-center gap-2">
              <button type="button" onClick={selectAll} className="px-3 py-1 bg-slate-100 rounded">Select all</button>
              <button type="button" onClick={clearAll} className="px-3 py-1 bg-slate-100 rounded">Clear</button>
              <span className="text-sm text-slate-500 ml-2">{selected.length} selected</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto border rounded p-2">
              {permissions.map((p:any) => (
                <label key={p.id} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.description}</div>
                  </div>
                </label>
              ))}
              {permissions.length === 0 && <div className="text-sm text-slate-500">No permissions loaded</div>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
