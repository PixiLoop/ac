'use client';

import { InstallationDetail } from "../../../../components/job-boards/operations/InstallationDetail";
import { AdminShell } from "../../../../components/layout/AdminShell";


export default function InvoicesPage() {
    

    return (
        <AdminShell title="Invoices" showTableDensity>
            <InstallationDetail />
        </AdminShell>
    );
}
