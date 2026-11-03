import React from 'react';
import { InstallationJob } from '../../types/installation';
import { Layout, Cpu, ShoppingBag } from 'lucide-react';

export type JobSource = 'Whiteboard' | 'FM Pre-Installation' | 'Sales Order';

export function getJobSource(job: InstallationJob): JobSource {
    // Explicit jobSource or sourceType
    if (job.jobSource === 'Sales Order' || job.sourceType === 'SALES_ORDER') {
        return 'Sales Order';
    }
    if (
        job.jobSource === 'FM Pre-Installation' ||
        job.sourceType === 'FM_PREINSTALL' ||
        job.jobType === 'FM Preinstall'
    ) {
        return 'FM Pre-Installation';
    }
    if (job.jobSource === 'Whiteboard' || job.sourceType === 'WHITEBOARD' || job.jobType === 'Whiteboard') {
        return 'Whiteboard';
    }

    // 1. Sales Order check:
    if (
        Boolean(job.salesOrderId) ||
        job.jobNumber?.startsWith('JOB-SO-') ||
        job.jobNumber?.startsWith('SO-') ||
        job.id?.startsWith('SO-') ||
        (job.notes && /sales order|so-\d+/i.test(job.notes))
    ) {
        return 'Sales Order';
    }

    // 2. FM Pre-Installation check:
    if (
        job.jobNumber?.startsWith('JOB-PI-') ||
        job.jobNumber?.startsWith('JOB-BULK-') ||
        job.id?.startsWith('INSTALL-BULK') ||
        (job.notes && /fm preinstall|preinstall|bulk rollout/i.test(job.notes))
    ) {
        return 'FM Pre-Installation';
    }

    // 3. Whiteboard Jobs (created through the New Installation modal or standard whiteboard):
    return 'Whiteboard';
}

interface JobSourceBadgeProps {
    source: JobSource;
    size?: 'sm' | 'xs';
    showIcon?: boolean;
    className?: string;
}

export const JobSourceBadge: React.FC<JobSourceBadgeProps> = ({
    source,
    size = 'sm',
    showIcon = true,
    className = '',
}) => {
    const isXs = size === 'xs';

    if (source === 'Whiteboard') {
        return (
            <span
                title="Source: Whiteboard Job (Created via New Installation)"
                className={`inline-flex items-center gap-1.5 font-semibold rounded-md border shrink-0 transition-colors shadow-2xs ${isXs
                        ? 'text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200'
                        : 'text-xs px-2.5 py-1 bg-purple-50 text-purple-700 border-purple-200'
                    } ${className}`}
            >
                <span className={`rounded-full shrink-0 bg-purple-500 ${isXs ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
                {showIcon && <Layout className={isXs ? 'w-3 h-3' : 'w-3.5 h-3.5 text-purple-600'} />}
                <span>Whiteboard</span>
            </span>
        );
    }

    if (source === 'FM Pre-Installation') {
        return (
            <span
                title="Source: FM Pre-Installation Module"
                className={`inline-flex items-center gap-1.5 font-semibold rounded-md border shrink-0 transition-colors shadow-2xs ${isXs
                        ? 'text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border-blue-200'
                    } ${className}`}
            >
                <span className={`rounded-full shrink-0 bg-blue-500 ${isXs ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
                {showIcon && <Cpu className={isXs ? 'w-3 h-3' : 'w-3.5 h-3.5 text-blue-600'} />}
                <span>FMP</span>
            </span>
        );
    }

    // Sales Order
    return (
        <span
            title="Source: Sales Order Job"
            className={`inline-flex items-center gap-1.5 font-semibold rounded-md border shrink-0 transition-colors shadow-2xs ${isXs
                    ? 'text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border-emerald-200'
                } ${className}`}
        >
            <span className={`rounded-full shrink-0 bg-emerald-500 ${isXs ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
            {showIcon && <ShoppingBag className={isXs ? 'w-3 h-3' : 'w-3.5 h-3.5 text-emerald-600'} />}
            <span>Airco Support</span>
        </span>
    );
};
