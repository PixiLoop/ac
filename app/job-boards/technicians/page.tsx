'use client';

import { TechnicianList } from '../../../components/job-boards/operations/TechnicianList';
import { AdminShell } from '../../../components/layout/AdminShell';

export default function TechniciansPage() {
    return (
        <AdminShell title="Technicians & Installers | Job Book" showTableDensity>
            <TechnicianList />
        </AdminShell>
    );
}
