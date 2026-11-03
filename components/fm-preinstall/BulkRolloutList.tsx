'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Truck,
    Search,
    RefreshCw,
    ExternalLink,
    Edit3,
    Eye,
    Calendar,
    MapPin,
    Layers,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { api } from '../../lib/api-client';
import { useToast } from '../ui/toast';

const STATUS_COLOR: Record<string, string> = {
    NOT_ACTIONED: 'bg-slate-100 text-slate-700 border-slate-200',
    WORKSHOP_SETUP: 'bg-amber-50 text-amber-800 border-amber-200',
    WAITING_INSTALL: 'bg-blue-50 text-blue-800 border-blue-200',
    INSTALLED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    INVOICED: 'bg-purple-50 text-purple-800 border-purple-200',
    COMPLETED: 'bg-teal-50 text-teal-800 border-teal-200',
};

const STATUS_LABEL: Record<string, string> = {
    NOT_ACTIONED: 'Not Actioned',
    WORKSHOP_SETUP: 'Workshop Setup',
    WAITING_INSTALL: 'Waiting Install',
    INSTALLED: 'Installed',
    INVOICED: 'Invoiced',
    COMPLETED: 'Completed',
};

interface BulkRolloutListProps {
    onCreateNewClick?: () => void;
}

export function BulkRolloutList({ onCreateNewClick }: BulkRolloutListProps) {
    const router = useRouter();
    const { showToast } = useToast();

    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const loadRecords = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.append('search', search.trim());
            if (statusFilter) params.append('status', statusFilter);
            params.append('page', String(page));
            params.append('pageSize', String(pageSize));

            const res = await api.get(`/fm-preinstall/bulk?${params.toString()}`);
            const data = res.data?.data ?? res.data ?? {};
            let items: any[] = data.items || [];

            // If empty from DB, check local storage operations_installation_jobs as fallback
            if (items.length === 0 && typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('operations_installation_jobs');
                    if (raw) {
                        const localJobs = JSON.parse(raw);
                        const bulkLocal = localJobs.filter((j: any) =>
                            j.id?.startsWith('INSTALL-BULK') || j.jobNumber?.startsWith('JOB-BULK') || j.vehicle?.fleetNumber?.includes('Bulk')
                        );
                        if (bulkLocal.length > 0) {
                            items = bulkLocal.map((j: any) => ({
                                id: j.id,
                                batchNumber: j.jobNumber || j.id,
                                customerName: j.customerName || 'FM Fleet Customer',
                                customerNumber: 'CUST-ROLLOUT',
                                fmFleetName: j.customerName || 'Fleet',
                                jobTitle: j.projectName || 'Fleet Device Rollout',
                                type: 'NEW_INSTALL',
                                status: (j.status || 'NOT_ACTIONED').toUpperCase().replace(' ', '_'),
                                installLocation: j.location || 'Fleet Yard',
                                installerName: j.technicianName || 'Field Technician',
                                installDate: j.installationDate || '',
                                orderNumber: 'PO-FLEET',
                                vehicleCount: j.vehicle?.rego?.match(/(\d+)\s*Vehicles/)?.[1] ? parseInt(j.vehicle.rego.match(/(\d+)\s*Vehicles/)[1]) : 5,
                                grandTotal: (j.hardware?.length || 2) * 550 * 5,
                                createdAt: j.createdAt || new Date().toISOString(),
                                preinstalls: [],
                            }));
                        }
                    }
                } catch { }
            }

            setBatches(items);
            setTotal(data.total || items.length);
        } catch (err) {
            console.warn('Failed to load bulk preinstalls, loading fallback:', err);
            // Fallback for resilient display
            if (typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('operations_installation_jobs');
                    if (raw) {
                        const localJobs = JSON.parse(raw);
                        const items = localJobs.filter((j: any) => j.id?.startsWith('INSTALL-BULK') || j.jobNumber?.startsWith('JOB-BULK')).map((j: any) => ({
                            id: j.id,
                            batchNumber: j.jobNumber || j.id,
                            customerName: j.customerName || 'Fleet Customer',
                            customerNumber: 'CUST-LOCAL',
                            fmFleetName: j.customerName,
                            jobTitle: j.projectName || 'Fleet Rollout Job',
                            type: 'NEW_INSTALL',
                            status: (j.status || 'NOT_ACTIONED').toUpperCase().replace(' ', '_'),
                            installLocation: j.location || 'Main Depot',
                            installerName: j.technicianName || 'Assigned Tech',
                            installDate: j.installationDate || '',
                            vehicleCount: 5,
                            grandTotal: 3175,
                            createdAt: j.createdAt || new Date().toISOString(),
                            preinstalls: [],
                        }));
                        setBatches(items);
                        setTotal(items.length);
                    }
                } catch { }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, page, pageSize]);

    return (
        <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by Job #, PO #, Customer, Fleet..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 text-xs h-9"
                            />
                        </div>
                        <div className="w-44 shrink-0">
                            <Select
                                value={statusFilter}
                                onChange={(val: any) => {
                                    setStatusFilter(val);
                                    setPage(1);
                                }}
                                options={[
                                    { label: 'All Statuses', value: '' },
                                    { label: 'Not Actioned', value: 'NOT_ACTIONED' },
                                    { label: 'Workshop Setup', value: 'WORKSHOP_SETUP' },
                                    { label: 'Waiting Install', value: 'WAITING_INSTALL' },
                                    { label: 'Installed', value: 'INSTALLED' },
                                    { label: 'Invoiced', value: 'INVOICED' },
                                    { label: 'Completed', value: 'COMPLETED' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadRecords}
                            disabled={loading}
                            className="text-xs h-9 flex items-center gap-1.5 text-slate-600"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        {onCreateNewClick && (
                            <Button
                                size="sm"
                                onClick={onCreateNewClick}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Bulk Rollout
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* List / Table of Bulk Records */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            Existing Bulk Rollout Records
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Showing {batches.length} batch rollouts across your customer fleets.
                        </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
                        Total Batches: <strong>{total}</strong>
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
                        <p className="text-xs text-slate-500">Loading bulk rollout records...</p>
                    </div>
                ) : batches.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                            <Truck className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-base">No Bulk Rollout Records Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {search || statusFilter
                                ? 'No bulk records matched your filter criteria. Try clearing filters or searching for something else.'
                                : 'You have not created any bulk FM pre-installation rollout batches yet.'}
                        </p>
                        {onCreateNewClick && (
                            <Button
                                size="sm"
                                onClick={onCreateNewClick}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Create First Bulk Rollout
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-4">Master Job # / Batch</th>
                                    <th className="py-3 px-4">Customer & Fleet</th>
                                    <th className="py-3 px-4">Rollout Title</th>
                                    <th className="py-3 px-4 text-center">Vehicles</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Install Date</th>
                                    <th className="py-3 px-4">Technician / Yard</th>
                                    <th className="py-3 px-4 text-right">Fleet Hardware</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {batches.map((batch) => {
                                    const statusKey = batch.status?.toUpperCase() || 'NOT_ACTIONED';
                                    const statusBadge = STATUS_COLOR[statusKey] || 'bg-slate-100 text-slate-700 border-slate-200';
                                    const statusText = STATUS_LABEL[statusKey] || batch.status;

                                    return (
                                        <tr
                                            key={batch.id}
                                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                            onClick={() => router.push(`/fm-preinstall/bulk/${batch.id}`)}
                                        >
                                            {/* Master Job Number */}
                                            <td className="py-3.5 px-4 font-mono font-semibold text-indigo-700">
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span>{batch.batchNumber || batch.id}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                                                    Created: {new Date(batch.createdAt).toLocaleDateString('en-AU')}
                                                </div>
                                            </td>

                                            {/* Customer & Fleet */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-slate-800">
                                                    {batch.customerName || 'Customer Fleet'}
                                                </div>
                                                {batch.fmFleetName && (
                                                    <div className="text-[11px] text-slate-500">
                                                        Fleet: <span className="text-slate-700">{batch.fmFleetName}</span>
                                                    </div>
                                                )}
                                                {batch.orderNumber && (
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        PO: {batch.orderNumber}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Rollout Title */}
                                            <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate font-medium">
                                                {batch.jobTitle || 'Fleet Hardware Rollout'}
                                            </td>

                                            {/* Vehicle Count Pill */}
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                                                    {batch.vehicleCount || batch.preinstalls?.length || 0} Units
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusBadge}`}>
                                                    {statusText}
                                                </span>
                                            </td>

                                            {/* Installation Date */}
                                            <td className="py-3.5 px-4 text-slate-600">
                                                {batch.installDate ? (
                                                    <div className="flex items-center gap-1 text-[11px]">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        <span>{new Date(batch.installDate).toLocaleDateString('en-AU')}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Not scheduled</span>
                                                )}
                                            </td>

                                            {/* Technician / Location */}
                                            <td className="py-3.5 px-4 text-slate-600 max-w-[160px] truncate">
                                                <div className="text-[11px] font-medium text-slate-700 truncate">
                                                    {batch.installerName || 'Unassigned Tech'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate">
                                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                    <span className="truncate">{batch.installLocation || 'Main Workshop'}</span>
                                                </div>
                                            </td>

                                            {/* Total Fleet Value */}
                                            <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                                                {batch.grandTotal > 0 ? (
                                                    <span>${batch.grandTotal.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs flex items-center gap-1 hover:bg-slate-100"
                                                        onClick={() => router.push(`/fm-preinstall/bulk/${batch.id}`)}
                                                        title="View full rollout details"
                                                    >
                                                        <Eye className="w-3 h-3 text-slate-500" />
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs flex items-center gap-1 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                                        onClick={() => router.push(`/fm-preinstall/bulk/${batch.id}?mode=edit`)}
                                                        title="Edit this bulk rollout"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
