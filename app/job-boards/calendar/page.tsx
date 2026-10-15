'use client';

import { OperationsCalendar } from '../../../components/job-boards/operations/OperationsCalendar';
import { AdminShell } from '../../../components/layout/AdminShell';

export default function OperationsCalendarPage() {
    return (
        <AdminShell title="Operations Calendar | Job Book" showTableDensity>
            <OperationsCalendar />
        </AdminShell>
    );
}
