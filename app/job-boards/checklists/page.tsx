'use client';

import { ChecklistTemplates } from '../../../components/job-boards/operations/ChecklistTemplates';
import { AdminShell } from '../../../components/layout/AdminShell';


export default function InvoicesPage() {
    

    return (
        <AdminShell title="Invoices" showTableDensity>
            <ChecklistTemplates />
        </AdminShell>
    );
}
