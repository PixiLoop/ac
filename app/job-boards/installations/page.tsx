'use client';

import { InstallationList } from '../../../components/job-boards/operations/InstallationList';
import { AdminShell } from '../../../components/layout/AdminShell';


export default function InvoicesPage() {
    

    return (
        <AdminShell title="Invoices" showTableDensity>
            <InstallationList />
        </AdminShell>
    );
}
