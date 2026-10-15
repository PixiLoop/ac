'use client';

import React from 'react';
import Link from 'next/link';

export default function JobList({ jobs, loading, onRefresh }: { jobs: any[]; loading: boolean; onRefresh: () => void; }) {
  if (loading) {
    return <div className="py-10 text-center text-slate-500">Loading…</div>;
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-500">No jobs assigned. Check back later.</div>
        <div className="mt-4">
          <button onClick={onRefresh} className="rounded bg-aqua px-4 py-2 text-white">Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <article key={j.id} className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">{j.jobNumber || '—'}</div>
              <div className="text-xs text-slate-500">{j.customer}</div>
            </div>
            <div className="text-xs text-slate-500">{j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : '—'}</div>
          </div>
          <div className="mt-2 text-sm text-slate-600">{j.shortAddress}</div>
          <div className="mt-3 flex gap-2">
            <Link href={`/jobs/${j.id}`} className="text-sm px-3 py-1 border rounded inline-block">
  Open
</Link>

            <button className="text-sm px-3 py-1 border rounded">Start</button>
          </div>
        </article>
      ))}
    </div>
  );
}
