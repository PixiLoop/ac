'use client';

import React, { useEffect, useState } from 'react';
import PwaShell from '../../components/pwa/PwaShell';
import JobList from '../../components/field-services/JobList';
import { api } from '../../lib/api-client';

export default function FieldServicesPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssigned = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/jobs/assigned?skip=0&take=50');
      const data = res.data?.data ?? res.data;
      setJobs(data.items ?? []);
    } catch (err: any) {
      console.error('fetchAssigned error', err);
      setError('Unable to load your jobs. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  return (
    <PwaShell title="Field Services">
      <div className="max-w-md mx-auto">
        <div className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded">{error}</div>
          )}





          <JobList jobs={jobs} loading={loading} onRefresh={fetchAssigned} />

        </div>
      </div>
    </PwaShell>
  );
}
