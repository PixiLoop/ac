'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useToast } from '../../../components/ui/toast';
import { api } from '../../../lib/api-client';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function PickingSlipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [slip, setSlip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<any[]>([]);
  const [pickedBy, setPickedBy] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/picking-slips/${id}`);
      const data = res.data?.data ?? res.data;
      setSlip(data);
      setLines(
        (data.lines ?? []).map((l: any) => ({
          id: l.id,
          productId: l.productId,
          description: l.description,
          onHandQty: Number(l.onHandQty),
          orderedQty: Number(l.orderedQty),
          pickedQty: Number(l.pickedQty),
          partNo: l.product?.productCode ?? '',
        })),
      );
      setPickedBy(data.pickedBy ?? '');
      setNotes(data.notes ?? '');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load picking slip' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const isDraft = slip?.status === 'DRAFT';

  const updatePickedQty = (index: number, value: string) => {
    const parsed = value === '' ? 0 : Number(value);
    const clean = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setLines(prev => prev.map((l, i) => (i === index ? { ...l, pickedQty: clean } : l)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/picking-slips/${id}`, { pickedBy, notes });

      await api.patch(`/picking-slips/${id}/lines`, {
        lines: lines.map(l => ({
          id: l.id,
          productId: l.productId,
          description: l.description,
          onHandQty: l.onHandQty,
          orderedQty: l.orderedQty,
          pickedQty: l.pickedQty,
        })),
      });

      showToast({ type: 'success', title: 'Success', message: 'Picking slip saved' });
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err?.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this picking slip as completed? You will not be able to edit picked quantities afterwards.')) {
      return;
    }
    setSaving(true);
    try {
      await handleSave();
      await api.post(`/picking-slips/${id}/complete`);
      showToast({ type: 'success', title: 'Completed', message: 'Picking slip marked as completed' });
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err?.response?.data?.message || 'Failed to complete' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminShell title="Picking Slip"><div className="p-6 text-sm text-slate-500">Loading…</div></AdminShell>;
  }

  if (!slip) {
    return <AdminShell title="Picking Slip"><div className="p-6">Picking slip not found.</div></AdminShell>;
  }

  return (
    <AdminShell title={`Picking Slip ${slip.slipNumber}`}>
      <div className="flex justify-end gap-2 mb-4">
        {slip.salesOrder && (
          <button
            type="button"
            onClick={() => router.push(`/salesorders/${slip.salesOrder.id}`)}
            className="text-sm text-blue-600 hover:underline border rounded-lg px-4 py-2 bg-muted/40"
          >
            ← {slip.salesOrder.orderNumber}
          </button>
        )}
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
        {isDraft && (
          <>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button onClick={handleComplete} disabled={saving}>
              Mark as Completed
            </Button>
          </>
        )}
      </div>

      <div className="border rounded p-4 bg-white mb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[slip.status] ?? ''}`}>
            {slip.status}
          </span>
          {slip.salesOrder?.customer?.name && (
            <span className="text-sm text-slate-600">Customer: {slip.salesOrder.customer.name}</span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Input
            label="Picked By"
            value={pickedBy}
            onChange={e => setPickedBy(e.target.value)}
            disabled={!isDraft}
          />
          <Input
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!isDraft}
          />
        </div>
      </div>

      <div className="border rounded overflow-hidden bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Part No</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-right">On Hand</th>
              <th className="px-4 py-2 text-right">Ordered Qty</th>
              <th className="px-4 py-2 text-right">Picked Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id ?? i} className="border-t">
                <td className="px-4 py-2 font-medium">{line.partNo}</td>
                <td className="px-4 py-2">{line.description}</td>
                <td className="px-4 py-2 text-right">{line.onHandQty}</td>
                <td className="px-4 py-2 text-right">{line.orderedQty}</td>
                <td className="px-4 py-2 text-right">
                  {isDraft ? (
                    <input
                      type="number"
                      min={0}
                      value={line.pickedQty}
                      onChange={e => updatePickedQty(i, e.target.value)}
                      className="w-24 border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <span>{line.pickedQty}</span>
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
