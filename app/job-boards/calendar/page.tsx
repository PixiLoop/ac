'use client';

import { OperationsCalendar } from '../../../components/job-boards/operations/OperationsCalendar';
import { AdminShell } from '../../../components/layout/AdminShell';


export default function InvoicesPage() {
    

    return (
        <AdminShell title="Invoices" showTableDensity>
            <OperationsCalendar />
        </AdminShell>
    );
}
