'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

interface Props {
  pickingSlips: any[];
  mode?: 'edit' | 'view';
}

export function PickingSlipListSection({ pickingSlips, mode = 'edit' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!pickingSlips.length) return null;

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-slate-50 px-4 py-3 border-b flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Picking Slips</h3>
          <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {pickingSlips.length}
          </span>
        </div>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <table className="min-w-full text-sm bg-white">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Slip #</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Picked By</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-right">Lines</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {pickingSlips.map(slip => (
              <tr key={slip.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{slip.slipNumber}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[slip.status] ?? ''}`}>
                    {slip.status}
                  </span>
                </td>
                <td className="px-4 py-2">{slip.pickedBy ?? '—'}</td>
                <td className="px-4 py-2">
                  {slip.createdAt ? new Date(slip.createdAt).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="px-4 py-2 text-right">{slip.lines?.length ?? 0}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => router.push(`/picking-slips/${slip.id}`)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    {mode === 'view' ? 'View →' : 'Edit →'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
