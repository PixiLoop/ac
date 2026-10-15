'use client';

import { OperationsDashboard } from '../../../components/job-boards/operations/OperationsDashboard';
import { AdminShell } from '../../../components/layout/AdminShell';

export default function OperationsDashboardPage() {
    return (
        <AdminShell title="Operations Dashboard | Job Book" showTableDensity>
            <OperationsDashboard />
        </AdminShell>
    );
}
