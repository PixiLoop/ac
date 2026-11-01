'use client';

import { OperationsCalendar } from '../../../components/job-boards/operations/OperationsCalendar';
import { AdminShell } from '../../../components/layout/AdminShell';


export default function OperationsCalendarPage() {
    return (
        <AdminShell title="Job Calendar" showTableDensity>
            <div className="flex-1 min-h-0 h-full w-full max-w-none overflow-hidden">
                <OperationsCalendar />
            </div>
        </AdminShell>
    );
}
