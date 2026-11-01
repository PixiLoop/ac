'use client';

import { AdminShell } from '../../../../components/layout/AdminShell';
import { JobBookEntryForm } from '../../../../components/job-boards/job-book-entry/JobBookEntryForm';

export default function NewJobBookEntryPage() {
  return (
    <AdminShell title="New Job Book Entry | Job Book" showTableDensity>
      <JobBookEntryForm mode="create" />
    </AdminShell>
  );
}
