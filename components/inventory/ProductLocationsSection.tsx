'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, X, Star, StarOff } from 'lucide-react';

import { api } from '../../lib/api-client';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SearchSelect } from '../ui/SearchSelect';
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell, Badge,
} from './shared-ui';

type LocationOption = { label: string; value: string };
type ProductLoc = {
  id: string;
  locationId: string;
  isPrimary: boolean;
  binCode?: string;
  location: {
    id: string; code: string; name: string;
    aisle?: string; bay?: string; level?: string; isActive: boolean;
  };
};

type Props = { productId: string };

export function ProductLocationsSection({ productId }: Props) {
  const { showToast } = useToast();
  const [rows, setRows]               = useState<ProductLoc[]>([]);
  const [loading, setLoading]         = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [allLocations, setAllLocations] = useState<LocationOption[]>([]);
  const [newLocId, setNewLocId]       = useState('');
  const [newBin, setNewBin]           = useState('');
  const [newPrimary, setNewPrimary]   = useState(false);
  const [adding, setAdding]           = useState(false);

  // Load all active locations for the dropdown
  useEffect(() => {
    api.get('/inventory/locations', { params: { isActive: 'true', take: 200 } })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        const list: { id: string; code: string; name: string }[] = data?.items ?? data ?? [];
        setAllLocations(list.map((l) => ({ label: `${l.code} — ${l.name}`, value: l.id })));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items/${productId}/locations`);
      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      showToast({ type: 'error', title: 'Failed to load locations' });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(rows.map((r) => r.locationId));
  const availableLocations = allLocations.filter((o) => !linkedIds.has(o.value));

  async function handleAdd() {
    if (!newLocId) return;
    setAdding(true);
    try {
      await api.post(`/inventory/items/${productId}/locations`, {
        locationId: newLocId,
        isPrimary: newPrimary || rows.length === 0, // first one auto-primary
        binCode: newBin || undefined,
      });
      showToast({ type: 'success', title: 'Location added' });
      setShowAdd(false);
      setNewLocId('');
      setNewBin('');
      setNewPrimary(false);
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to add' });
    } finally {
      setAdding(false);
    }
  }

  async function handleSetPrimary(locationId: string) {
    try {
      await api.patch(`/inventory/items/${productId}/locations/${locationId}/set-primary`);
      showToast({ type: 'success', title: 'Primary location updated' });
      load();
    } catch {
      showToast({ type: 'error', title: 'Failed to update primary' });
    }
  }

  async function handleRemove(locationId: string) {
    try {
      await api.delete(`/inventory/items/${productId}/locations/${locationId}`);
      showToast({ type: 'success', title: 'Location removed' });
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to remove' });
    }
  }

  return (
    <div className="rounded-xl border bg-emerald-50/30 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <h3 className="font-medium text-emerald-800">Warehouse Locations</h3>
          {rows.length > 0 && (
            <span className="text-xs text-muted-foreground">({rows.length})</span>
          )}
        </div>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={availableLocations.length === 0}>
            <Plus className="mr-1 h-3.5 w-3.5" />Add Location
          </Button>
        )}
      </div>

      {/* Add row form */}
      {showAdd && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-white p-3">
          <p className="mb-3 text-xs font-medium text-emerald-800">Assign Location</p>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto_auto]">
            <SearchSelect
              placeholder="Select location…"
              value={newLocId}
              options={availableLocations}
              onChange={setNewLocId}
            />
            <Input
              placeholder="Bin / Slot (optional)"
              value={newBin}
              onChange={(e) => setNewBin(e.target.value)}
            />
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <input
                type="checkbox"
                className="rounded"
                checked={newPrimary || rows.length === 0}
                disabled={rows.length === 0}
                onChange={(e) => setNewPrimary(e.target.checked)}
              />
              Primary
            </label>
            <div className="flex gap-2">
              <Button size="sm" disabled={!newLocId || adding} onClick={handleAdd}>
                {adding ? '…' : 'Add'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewLocId(''); setNewBin(''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {availableLocations.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">All active locations are already assigned.</p>
          )}
        </div>
      )}

      {/* Locations table */}
      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No locations assigned. Click "Add Location" to assign.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Aisle</TableHead>
              <TableHead>Bay</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Bin / Slot</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>{''}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.location.code}</TableCell>
                <TableCell>{row.location.name}</TableCell>
                <TableCell>{row.location.aisle ?? '—'}</TableCell>
                <TableCell>{row.location.bay ?? '—'}</TableCell>
                <TableCell>{row.location.level ?? '—'}</TableCell>
                <TableCell>{row.binCode ?? '—'}</TableCell>
                <TableCell>
                  {row.isPrimary ? (
                    <Badge variant="default" className="text-xs">Primary</Badge>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500"
                      onClick={() => handleSetPrimary(row.locationId)}
                    >
                      <StarOff className="h-3.5 w-3.5" />Set primary
                    </button>
                  )}
                </TableCell>

















                
                <TableCell>
                  <button
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                    onClick={() => handleRemove(row.locationId)}
                    title="Remove location"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
