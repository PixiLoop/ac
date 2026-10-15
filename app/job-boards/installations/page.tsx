'use client';

import { InstallationList } from '../../../components/job-boards/operations/InstallationList';
import { AdminShell } from '../../../components/layout/AdminShell';

export default function InstallationJobsPage() {
    return (
        <AdminShell title="Installation Jobs | Job Book" showTableDensity>
            <InstallationList />
        </AdminShell>
    );
}
