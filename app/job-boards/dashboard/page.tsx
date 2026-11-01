'use client';

import { OperationsDashboard } from '../../../components/job-boards/operations/OperationsDashboard';
import { AdminShell } from '../../../components/layout/AdminShell';

export default function OperationsDashboardPage() {
    return (
        <AdminShell title="Operations Dashboard | Job Book" showTableDensity>
            <div className="flex-1 min-h-0 h-full w-full max-w-none flex flex-col">
                <OperationsDashboard />
            </div>
        </AdminShell>
    );
}
