'use client';

import { OperationsDashboard } from '../../../components/job-boards/operations/OperationsDashboard';
import { AdminShell } from '../../../components/layout/AdminShell';


export default function InvoicesPage() {
    

    return (
        <AdminShell title="Invoices" showTableDensity>
            <OperationsDashboard />
        </AdminShell>
    );
}
