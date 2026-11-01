'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AdminShell } from '../../../../components/layout/AdminShell';
import { JobBookEntryForm } from '../../../../components/job-boards/job-book-entry/JobBookEntryForm';
import { jobBookEntryApi } from '../../../../lib/job-book-entry-client';
import type { JobBookEntryFormState } from '../../../../components/job-boards/job-book-entry/types';

export default function EditJobBookEntryPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [initial, setInitial] = useState<JobBookEntryFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const res = await jobBookEntryApi.get(id);
      if (cancelled) return;
      if (res.error || !res.data) {
        setError(res.error?.message || 'Entry not found');
        return;
      }
      const raw: any = res.data;
      const data = raw?.id ? raw : raw?.data || raw;
      setInitial({
        ...data,
        jobNumber:
          String(data?.jobNumber || '').trim() ||
          String(data?.jobNum || '').trim() ||
          String(data?.entryNumber || '').trim() ||
          '',
        jobNum: String(data?.jobNum || data?.jobNumber || '').trim(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AdminShell title="Edit Job Book Entry | Job Book" showTableDensity>
      {!initial && !error ? (
        <div className="py-16 text-center text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          Loading entry…
        </div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-rose-600">{error}</div>
      ) : (
        <JobBookEntryForm mode="edit" initial={initial!} />
      )}
    </AdminShell>
  );
}
