'use client';

import { AdminShell } from '../../../components/layout/AdminShell';
import { JobBookEntryList } from '../../../components/job-boards/job-book-entry/JobBookEntryList';

export default function JobBookEntryPage() {
  return (
    <AdminShell title="Job Book Entry | Job Book" showTableDensity>
      <JobBookEntryList />
    </AdminShell>
  );
}
