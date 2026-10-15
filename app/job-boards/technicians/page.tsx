'use client';

import { TechnicianList } from '../../../components/job-boards/operations/TechnicianList';
import { AdminShell } from '../../../components/layout/AdminShell';


export default function InvoicesPage() {
    

    return (
        <AdminShell title="Invoices" showTableDensity>
            <TechnicianList />
        </AdminShell>
    );
}
