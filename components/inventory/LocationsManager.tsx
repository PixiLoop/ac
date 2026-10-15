'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin, Search } from 'lucide-react';

import { api } from '../../lib/api-client';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell, Badge, Card, CardHeader, CardTitle, CardContent,
} from './shared-ui';

import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

type InvLocation = {
  id: string;
  code: string;
  name: string;
  aisle?: string;
  bay?: string;
  level?: string;
  description?: string;
  isActive: boolean;
  _count?: { productLocations: number };
};

const EMPTY: Omit<InvLocation, 'id' | 'isActive' | '_count'> = {
  code: '', name: '', aisle: '', bay: '', level: '', description: '',
};

export function LocationsManager() {
  const { showToast } = useToast();
  const [items, setItems] = useState<InvLocation[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InvLocation | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('locations.view');
  const canCreate = has('locations.create');
  const canEdit = has('locations.edit');
  const canDelete = has('locations.delete');

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await api.get('/inventory/locations', { params: { search: search || undefined, take: 100 } });
      const data = res.data?.data ?? res.data;
      setItems(data?.items ?? data ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      showToast({ type: 'error', title: 'Failed to load locations' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(loc: InvLocation) {
    setEditing(loc);
    setForm({ code: loc.code, name: loc.name, aisle: loc.aisle ?? '', bay: loc.bay ?? '', level: loc.level ?? '', description: loc.description ?? '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      showToast({ type: 'error', title: 'Code and Name are required' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/inventory/locations/${editing.id}`, form);
        showToast({ type: 'success', title: 'Location updated' });
      } else {
        await api.post('/inventory/locations', form);
        showToast({ type: 'success', title: 'Location created' });
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(loc: InvLocation) {
    try {
      await api.patch(`/inventory/locations/${loc.id}/toggle-active`);
      showToast({ type: 'success', title: `Location ${loc.isActive ? 'deactivated' : 'activated'}` });
      load();
    } catch {
      showToast({ type: 'error', title: 'Failed to toggle status' });
    }
  }

  async function handleDelete(loc: InvLocation) {
    if (!confirm(`Delete location "${loc.code}"?`)) return;
    try {
      await api.delete(`/inventory/locations/${loc.id}`);
      showToast({ type: 'success', title: 'Location deleted' });
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Cannot delete' });
    }
  }

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-slate-600">You do not have permission.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-600" />
            <CardTitle>Warehouse Locations</CardTitle>
            <span className="text-sm text-muted-foreground">({total})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-8 w-48"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />New Location
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Inline form ─────────────────────────────────────────────── */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <h3 className="mb-4 font-medium text-blue-800">{editing ? 'Edit Location' : 'New Location'}</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Code <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. A01-B02" value={form.code} onChange={set('code')} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Aisle A, Bay 1, Level 2" value={form.name} onChange={set('name')} />
              </div>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Aisle</Label>
                <Input placeholder="A" value={form.aisle} onChange={set('aisle')} />
              </div>
              <div className="space-y-1.5">
                <Label>Bay</Label>
                <Input placeholder="01" value={form.bay} onChange={set('bay')} />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Input placeholder="L1" value={form.level} onChange={set('level')} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Optional notes" value={form.description} onChange={set('description')} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Aisle</TableHead>
              <TableHead>Bay</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{''}</TableHead>
            </TableRow>
          </TableHeader>






          
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">No locations found.</TableCell></TableRow>
            ) : items.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-mono font-medium">{loc.code}</TableCell>
                <TableCell>{loc.name}</TableCell>
                <TableCell>{loc.aisle ?? '—'}</TableCell>
                <TableCell>{loc.bay ?? '—'}</TableCell>
                <TableCell>{loc.level ?? '—'}</TableCell>
                <TableCell className="text-right">{loc._count?.productLocations ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={loc.isActive ? 'default' : 'secondary'}>
                    {loc.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      className="p-1.5 rounded hover:bg-slate-100"
                      title={loc.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggle(loc)}
                    >
                      {loc.isActive
                        ? <ToggleRight className="h-4 w-4 text-green-600" />
                        : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    </button>
                    <button className="p-1.5 rounded hover:bg-slate-100" onClick={() => openEdit(loc)}>
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-red-50"
                      onClick={() => handleDelete(loc)}
                      disabled={(loc._count?.productLocations ?? 0) > 0}
                      title={(loc._count?.productLocations ?? 0) > 0 ? 'Cannot delete — products linked' : 'Delete'}
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${(loc._count?.productLocations ?? 0) > 0 ? 'text-slate-300' : 'text-red-400'}`} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
