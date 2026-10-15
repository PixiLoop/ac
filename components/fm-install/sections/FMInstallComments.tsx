'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

export function FMInstallComments({ installId }: { installId: string }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/fm-install/${installId}/comments`)
      .then(res => setComments(res.data?.data ?? res.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (installId) load(); }, [installId]);

  const submit = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await api.post(`/fm-install/${installId}/comments`, { message: message.trim() });
      setMessage('');
      load();
    } catch {
      showToast({ type: 'error', title: 'Failed to add memo' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border bg-white p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm text-slate-700">Memo / Comments</span>
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
          {comments.length}
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
        {loading && <p className="text-slate-400">Loading…</p>}
        {!loading && comments.length === 0 && <p className="text-slate-400">No memos yet.</p>}
        {comments.map((c: any) => (
          <div key={c.id} className="border-b pb-1.5">
            <p className="text-slate-700">{c.message}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {c.createdByName ?? 'User'} — {new Date(c.createdAt).toLocaleString('en-AU')}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="Add a memo…"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded text-[11px] disabled:opacity-50"
          onClick={submit}
          disabled={saving || !message.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}