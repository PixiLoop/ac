'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { InstallationDetail } from "../../../../components/job-boards/operations/InstallationDetail";
import { AdminShell } from "../../../../components/layout/AdminShell";
import { useOperations } from '../../../../providers/OperationsContext';

export default function InstallationDetailPage() {
    const params = useParams();
    const { setSelectedJobId, selectedJob } = useOperations();

    useEffect(() => {
        if (params?.id) {
            setSelectedJobId(String(params.id));
        }
    }, [params?.id, setSelectedJobId]);

    const title = selectedJob
        ? `${selectedJob.jobNumber || selectedJob.id} — Installation Job`
        : 'Installation Job Detail | Job Book';

    return (
        <AdminShell title={title} showTableDensity>
            <InstallationDetail />
        </AdminShell>
    );
}
