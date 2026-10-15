'use client';

import { ChecklistTemplates } from '../../../components/job-boards/operations/ChecklistTemplates';
import { AdminShell } from '../../../components/layout/AdminShell';

export default function ChecklistTemplatesPage() {
    return (
        <AdminShell title="Checklist Templates | Job Book" showTableDensity>
            <ChecklistTemplates />
        </AdminShell>
    );
}
