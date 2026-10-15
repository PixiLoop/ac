'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../../providers/auth-provider';
import { invalidateDispatchMethodCache } from '../../../components/customers/forms/CustomerDispatchForm';
import { createPermissionChecker } from '../../../lib/permission';

export default function DispatchMethodsPage() {
  const { showToast } = useToast();
  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canCreate = has('dispatchmethods.create');
  const canEdit = has('dispatchmethods.edit');
  const canDelete = has('dispatchmethods.delete');
  const canView = has('dispatchmethods.view');

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null); // null = not editing, {} = creating
  const [form, setForm] = useState({ code: '', label: '', sortOrder: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dispatch-methods');
      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      showToast({ type: 'error', title: 'Failed to load dispatch methods' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm({ code: '', label: '', sortOrder: '' });
    setEditing({});
  };

  const startEdit = (row: any) => {
    setForm({ code: row.code, label: row.label, sortOrder: row.sortOrder ?? '' });
    setEditing(row);
  };

  const cancel = () => setEditing(null);

  const save = async () => {
    if (!form.label.trim()) {
      showToast({ type: 'error', title: 'Label is required' });
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        await api.patch(`/dispatch-methods/${editing.id}`, {
          label: form.label,
          sortOrder: form.sortOrder === '' ? undefined : Number(form.sortOrder),
        });
      } else {
        if (!form.code.trim()) {
          showToast({ type: 'error', title: 'Code is required' });
          setSaving(false);
          return;
        }
        await api.post('/dispatch-methods', {
          code: form.code,
          label: form.label,
          sortOrder: form.sortOrder === '' ? undefined : Number(form.sortOrder),
        });
      }
      showToast({ type: 'success', title: 'Saved' });
      invalidateDispatchMethodCache();
      setEditing(null);
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save failed', message: err?.response?.data?.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: any) => {
    const confirmMsg = row.isActive
      ? `Deactivate "${row.label}"? It will disappear from new selection dropdowns, but existing records that already use it are unaffected.`
      : `Reactivate "${row.label}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/dispatch-methods/${row.id}`, { isActive: !row.isActive });
      showToast({ type: 'success', title: row.isActive ? 'Deactivated' : 'Reactivated' });
      invalidateDispatchMethodCache();
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Update failed', message: err?.response?.data?.message });
    }
  };

  if (!canView) {
    return (
      <AdminShell title="Dispatch Methods">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Dispatch Methods">
      <div className="flex justify-end mb-4">
        {canCreate && (
          <Button onClick={startCreate}>Add Dispatch Method</Button>
        )}
      </div>

      {editing && (
        <div className="border rounded p-4 bg-white mb-4 space-y-3">
          <h3 className="font-semibold text-sm">{editing.id ? 'Edit' : 'New'} Dispatch Method</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Code"
              value={form.code}
              onChange={(e: any) => setForm(f => ({ ...f, code: e.target.value }))}
              disabled={!!editing.id}
              placeholder="e.g. TNT_AIRCO"
            />
            <Input
              label="Label"
              value={form.label}
              onChange={(e: any) => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. TNT AIRCO"
            />
            <Input
              label="Sort Order"
              type="number"
              value={form.sortOrder}
              onChange={(e: any) => setForm(f => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save</Button>
          </div>
        </div>
      )}

      <div className="border rounded bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Label</th>
              <th className="px-4 py-2 text-right">Sort Order</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">No dispatch methods yet.</td></tr>
            )}
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2 font-mono">{row.code}</td>
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2 text-right">{row.sortOrder ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {canEdit && (
                    <button onClick={() => startEdit(row)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  )}
                  {canDelete && (
                    <button onClick={() => toggleActive(row)} className="text-xs text-slate-500 hover:underline">
                      {row.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}