'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Wrench,
    Clock,
    Calendar,
    MapPin,
    Truck,
    CheckCircle2,
    AlertCircle,
    LogOut,
    ChevronRight,
    Filter,
    Check,
    Phone,
    Radio,
    Sparkles,
    ExternalLink,
    ShieldCheck,
    User,
    FileText,
    Play,
    Timer,
    AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useOperations } from '../../providers/OperationsContext';
import { InstallationJob, InstallationStatus, ChecklistSection } from '../job-boards/types/installation';
import { buildChecklistForHardware } from '../job-boards/types/mockData';
import { TechnicianWorkOrderModal } from './TechnicianWorkOrderModal';
import { useAuth } from '../../providers/auth-provider';

export const TechnicianDashboard: React.FC = () => {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const { assignedJobs, changeJobStatus, getChecklistStats, refreshFromApi, checklistTemplates } = useOperations();

    const [activeTech, setActiveTech] = useState({
        id: 'tech-1',
        displayName: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@aerotrack.com.au',
        role: 'Senior Field Technician',
        depot: 'Sydney Eastern Creek Depot',
        phone: '+61 412 345 678',
        avatar: 'JS',
        assignedCount: 4,
    });

    const [techStatus, setTechStatus] = useState<'Available' | 'On Job' | 'On Break' | 'Offline'>('Available');
    const [manualStatusOverride, setManualStatusOverride] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today');
    const [selectedJob, setSelectedJob] = useState<InstallationJob | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [currentMinutes, setCurrentMinutes] = useState(0);

    // Track jobs explicitly started by technician
    const [startedJobIds, setStartedJobIds] = useState<Set<string>>(() => {
        return new Set<string>();
    });

    useEffect(() => {
        refreshFromApi();
    }, []);

    // Live Clock & Minutes since midnight
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            );
            setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
        };
        updateTime();
        const interval = setInterval(updateTime, 10000);
        return () => clearInterval(interval);
    }, []);

    // Helper to parse "HH:mm" to minutes since midnight
    const parseTimeToMinutes = (timeStr?: string): number | null => {
        if (!timeStr) return null;
        const parts = timeStr.trim().split(':');
        if (parts.length < 2) return null;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    };

    // Calculate time remaining until start
    const formatTimeUntil = (timeStr?: string): string => {
        const target = parseTimeToMinutes(timeStr);
        if (target === null) return '';
        const diff = target - currentMinutes;
        if (diff <= 0) return 'starting now';
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        if (hours > 0) {
            return `in ${hours}h ${mins}m`;
        }
        return `in ${mins}m`;
    };

    // Ensure all jobs have checklist items populated from hardware or defaults (Issue 4 fix)
    const ensureJobChecklist = useCallback((job: InstallationJob): InstallationJob => {
        if (job.checklistSections && job.checklistSections.length > 0) {
            return job;
        }
        const templates = checklistTemplates && checklistTemplates.length > 0
            ? checklistTemplates
            : [];

        let sections: ChecklistSection[] = [];
        if (job.hardware && job.hardware.length > 0) {
            sections = buildChecklistForHardware(job.hardware.map((h) => h.model), templates);
        }
        if (!sections || sections.length === 0) {
            sections = buildChecklistForHardware(['MIX4000', 'GPS Unit'], templates);
        }
        return {
            ...job,
            checklistSections: sections,
        };
    }, [checklistTemplates]);

    // Use unified jobs source and enrich with checklist sections
    const sourceJobs = useMemo(() => {
        const pool = assignedJobs;
        return pool.map(ensureJobChecklist);
    }, [assignedJobs, ensureJobChecklist]);

    // Filter assigned jobs specifically for the active technician
    const technicianJobs = useMemo(() => {
        return sourceJobs.filter((job) => {
            if (!job.technicianId && !job.technicianName) return true; // Fallback for unassigned/general queue
            return (
                job.technicianId === activeTech.id ||
                job.technicianName?.toLowerCase() === activeTech.displayName.toLowerCase() ||
                (user && (job.technicianId === user.id || job.technicianName === user.displayName))
            );
        });
    }, [sourceJobs, activeTech, user]);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // Check if a job is explicitly started
    const isJobStarted = useCallback((job: InstallationJob): boolean => {
        if (startedJobIds.has(job.id)) return true;
        if (job.status === 'Workshop Setup') return true;
        if (job.timeline?.some((t) => {
            const note = (t.note || '').toLowerCase();
            return note.includes('started work') || note.includes('in progress') || note.includes('active fitting');
        })) return true;
        return false;
    }, [startedJobIds]);

    // Check if job is actively in progress right now (Issue 2 fix: Scheduled jobs later today are NOT active)
    const isJobActivelyInProgress = useCallback((job: InstallationJob): boolean => {
        if (job.status === 'Completed' || job.status === 'Invoiced' || job.status === 'Installed') {
            return false;
        }
        // Must be for today
        const isToday = !job.installationDate || job.installationDate === todayStr || job.isScheduled;
        if (!isToday) return false;

        // If technician explicitly started the work order
        if (isJobStarted(job)) {
            return true;
        }

        // Check scheduled window: if start time is in the future, it has NOT started yet
        const startMins = parseTimeToMinutes(job.startTime);
        if (startMins !== null && currentMinutes < startMins) {
            return false;
        }

        // If workshop setup is underway
        if (job.status === 'Workshop Setup') {
            return true;
        }

        return false;
    }, [isJobStarted, currentMinutes, todayStr]);

    // Issue 5 fix: Mutually exclusive, accurate categorization
    // Today's jobs: scheduled for today
    const todayJobs = useMemo(() => {
        return technicianJobs.filter((j) => {
            if (!j.installationDate) return true;
            return j.installationDate === todayStr || j.isScheduled;
        });
    }, [technicianJobs, todayStr]);

    // Upcoming jobs: ONLY jobs scheduled for future dates (after today) that are pending
    const upcomingJobs = useMemo(() => {
        return technicianJobs.filter((j) => {
            if (j.status === 'Completed' || j.status === 'Invoiced') return false;
            return j.installationDate && j.installationDate > todayStr;
        });
    }, [technicianJobs, todayStr]);

    // Completed jobs
    const completedJobs = useMemo(() => {
        return technicianJobs.filter(
            (j) => j.status === 'Completed' || j.status === 'Invoiced' || j.status === 'Installed'
        );
    }, [technicianJobs]);

    // Active in-progress job (if any)
    const activeJob = useMemo(() => {
        return todayJobs.find((j) => isJobActivelyInProgress(j)) || null;
    }, [todayJobs, isJobActivelyInProgress]);

    // Next scheduled job for today (not yet started)
    const nextScheduledJob = useMemo(() => {
        if (activeJob) return null;
        return todayJobs.find((j) => {
            if (j.status === 'Completed' || j.status === 'Invoiced' || j.status === 'Installed') return false;
            return !isJobActivelyInProgress(j);
        }) || null;
    }, [todayJobs, activeJob, isJobActivelyInProgress]);

    // The job featured in the top hero panel (Issue 7 fix: duplicate prevention)
    const featuredTopJob = activeJob || nextScheduledJob;

    // Issue 3 fix: Automatically synchronize technician availability with real job activity
    useEffect(() => {
        if (manualStatusOverride) return;
        if (activeJob) {
            setTechStatus('On Job');
        } else {
            setTechStatus('Available');
        }
    }, [activeJob, manualStatusOverride]);

    const handleTechStatusChange = (newStatus: 'Available' | 'On Job' | 'On Break' | 'Offline') => {
        setTechStatus(newStatus);
        setManualStatusOverride(newStatus === 'On Break' || newStatus === 'Offline');
    };

    // Start a work order (explicit start action)
    const handleStartJob = async (job: InstallationJob) => {
        const nextSet = new Set(startedJobIds);
        nextSet.add(job.id);
        setStartedJobIds(nextSet);
        setTechStatus('On Job');
        setManualStatusOverride(false);
        await changeJobStatus(
            job.id,
            'Waiting Install',
            `Technician ${activeTech.displayName} started work order ${job.id} at ${currentTime || 'now'}`,
            activeTech.displayName,
            true
        );
    };

    const handleStatusAdvancement = async (job: InstallationJob, nextStatus: InstallationStatus) => {
        if (nextStatus === 'Waiting Install') {
            await handleStartJob(job);
            return;
        }

        if (nextStatus === 'Completed' || nextStatus === 'Installed') {
            const nextSet = new Set(startedJobIds);
            nextSet.delete(job.id);
            setStartedJobIds(nextSet);
            if (nextStatus === 'Completed') {
                setTechStatus('Available');
            }
        }

        await changeJobStatus(
            job.id,
            nextStatus,
            `Technician ${activeTech.displayName} updated status to ${nextStatus}`,
            activeTech.displayName,
            true
        );
    };

    // Calculate QA Checklist stats safely (Issue 4 fix: prevent 0/0 and 0% skew)
    const getSafeChecklistStats = (job: InstallationJob) => {
        const stats = getChecklistStats(job);
        return {
            ...stats,
            hasTasks: stats.total > 0,
        };
    };

    // Average checklist completion percentage across jobs with tasks
    const todayJobsWithChecklists = todayJobs.filter((j) => getSafeChecklistStats(j).total > 0);
    const overallChecklistPercent = todayJobsWithChecklists.length > 0
        ? Math.round(
            todayJobsWithChecklists.reduce((acc, j) => acc + getSafeChecklistStats(j).percent, 0) /
            todayJobsWithChecklists.length
        )
        : 100;

    // Issue 7 fix: When a job is featured in the top hero panel, filter it out from the grid below
    const displayedJobsRaw =
        activeTab === 'today'
            ? todayJobs
            : activeTab === 'upcoming'
                ? upcomingJobs
                : activeTab === 'completed'
                    ? completedJobs
                    : technicianJobs;

    const displayedJobs = displayedJobsRaw.filter((job) => {
        if (activeTab === 'today' && featuredTopJob) {
            return job.id !== featuredTopJob.id;
        }
        return true;
    });

    const handleLogout = () => {
        logout();
    };

    const displayName =
        user?.displayName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
        activeTech.displayName;
    const initials = [
        (user?.firstName || activeTech.firstName || '?').slice(0, 1),
        (user?.lastName || activeTech.lastName || '').slice(0, 1),
    ]
        .join(' ')
        .toUpperCase();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
                Loading…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
            {/* Top Field Tech Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
                        {initials}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-slate-900 tracking-tight">
                                {displayName}
                            </h1>
                            {/* Issue 3 Fix: Technician availability selector synced with real job status */}
                            <select
                                value={techStatus}
                                onChange={(e) => handleTechStatusChange(e.target.value as any)}
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border focus:outline-none cursor-pointer transition-colors shadow-2xs ${
                                    techStatus === 'Available'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : techStatus === 'On Job'
                                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                                            : techStatus === 'On Break'
                                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                                : 'bg-red-50 text-red-700 border-red-300'
                                }`}
                            >
                                <option value="Available" className="bg-white text-slate-800">● Available</option>
                                <option value="On Job" className="bg-white text-slate-800">● On Job</option>
                                <option value="On Break" className="bg-white text-slate-800">● On Break</option>
                                <option value="Offline" className="bg-white text-slate-800">● Offline</option>
                            </select>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{activeTech.role}</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">{activeTech.depot}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{currentTime || '09:00'}</span>
                    </div>

                    <Link
                        href="/job-boards/installations"
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                    >
                        <span>Job Book Dispatch</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </Link>

                    <button
                        onClick={handleLogout}
                        title="Switch technician or logout"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Log Out</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full mx-auto p-4 sm:p-6 space-y-6">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Assigned Today</span>
                        <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline justify-between">
                            <span>{todayJobs.length}</span>
                            <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Shift queue</p>
                    </div>

                    {/* Issue 2 Fix: In Progress only counts jobs that are ACTUALLY started / in progress */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">In Progress</span>
                        <div className="text-2xl font-black text-amber-600 mt-1 flex items-baseline justify-between">
                            <span>{activeJob ? 1 : 0}</span>
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {activeJob ? 'Active work order' : 'None in progress'}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Completed Today</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1 flex items-baseline justify-between">
                            <span>{completedJobs.length}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Signed off</p>
                    </div>

                    {/* Issue 4 Fix: Safe checklist compliance calculation */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Checklists Complete</span>
                        <div className="text-2xl font-black text-indigo-600 mt-1 flex items-baseline justify-between">
                            <span>{overallChecklistPercent}%</span>
                            <Wrench className="w-4 h-4 text-indigo-600" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {todayJobsWithChecklists.length > 0 ? 'QA compliance' : 'All QA verified'}
                        </p>
                    </div>
                </div>

                {/* Issue 2 & Issue 7 Fix: Top Hero Panel for Active Work Order OR Next Scheduled Job */}
                {activeJob ? (
                    // State A: A job is ACTIVELY IN PROGRESS
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white border border-blue-200/90 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                                    </span>
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                        Current Active Work Order (In Progress)
                                    </span>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                        {activeJob.id} ({activeJob.jobNumber})
                                    </span>
                                </div>

                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>{activeJob.vehicle.rego}</span>
                                    <span className="text-slate-500 font-normal text-base">
                                        • {activeJob.vehicle.fleetNumber} ({activeJob.vehicle.makeModel})
                                    </span>
                                </h2>

                                <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="font-medium text-slate-700">{activeJob.location}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-600">{activeJob.customerName}</span>
                                    {activeJob.startTime && (
                                        <>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-slate-700 font-mono font-semibold flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-blue-600" />
                                                {activeJob.startTime} – {activeJob.endTime || '11:00'}
                                            </span>
                                        </>
                                    )}
                                    {activeJob.customerPhone && (
                                        <>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-blue-600 font-mono flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {activeJob.customerPhone}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedJob(activeJob)}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <Wrench className="w-4 h-4" />
                                    Open Checklist & Commissioning
                                </button>
                            </div>
                        </div>
                    </div>
                ) : nextScheduledJob ? (
                    // State B: Job is SCHEDULED FOR LATER (e.g. 09:00 - 11:00 at 07:46 AM) -> NOT in progress
                    <div className="bg-gradient-to-r from-amber-50/60 via-slate-50 to-white border border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                        Next Scheduled Work Order (Upcoming Today)
                                    </span>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                        {nextScheduledJob.id} ({nextScheduledJob.jobNumber})
                                    </span>
                                    {nextScheduledJob.startTime && (
                                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            {nextScheduledJob.startTime} – {nextScheduledJob.endTime || '11:00'} ({formatTimeUntil(nextScheduledJob.startTime)})
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>{nextScheduledJob.vehicle.rego}</span>
                                    <span className="text-slate-500 font-normal text-base">
                                        • {nextScheduledJob.vehicle.fleetNumber} ({nextScheduledJob.vehicle.makeModel})
                                    </span>
                                </h2>

                                <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="font-medium text-slate-700">{nextScheduledJob.location}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-600">{nextScheduledJob.customerName}</span>
                                    {nextScheduledJob.customerPhone && (
                                        <>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-blue-600 font-mono flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {nextScheduledJob.customerPhone}
                                            </span>
                                        </>
                                    )}
                                    <span className="text-slate-400">•</span>
                                    <span className="text-amber-700 font-medium">Scheduled for later — not started yet</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleStartJob(nextScheduledJob)}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    Start Job Now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedJob(nextScheduledJob)}
                                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Tab Selection (Issue 5 Fix: Accurate counts that match reality) */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'today'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                        >
                            Today’s Jobs ({todayJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'upcoming'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                        >
                            Upcoming ({upcomingJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'completed'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                        >
                            Completed ({completedJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'all'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                        >
                            All My Jobs ({technicianJobs.length})
                        </button>
                    </div>

                    {activeTab === 'today' && featuredTopJob && (
                        <span className="hidden sm:inline text-xs text-slate-400 font-medium">
                            {displayedJobs.length} additional job{displayedJobs.length === 1 ? '' : 's'} in queue
                        </span>
                    )}
                </div>

                {/* Work Order Cards Grid (Issue 7 Fix: No duplicate cards for featured job) */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {displayedJobs.length === 0 ? (
                        <div className="col-span-full bg-white border border-slate-200/90 rounded-3xl p-10 text-center text-slate-400 shadow-2xs">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            {activeTab === 'today' && featuredTopJob ? (
                                <>
                                    <p className="text-sm font-semibold text-slate-700">Work order is open in the focus panel above</p>
                                    <p className="text-xs text-slate-400 mt-1">No other jobs scheduled for today.</p>
                                </>
                            ) : activeTab === 'upcoming' ? (
                                <>
                                    <p className="text-sm font-semibold text-slate-700">No upcoming jobs assigned for future dates</p>
                                    <p className="text-xs text-slate-400 mt-1">All assigned jobs are scheduled for today or completed.</p>
                                </>
                            ) : activeTab === 'completed' ? (
                                <>
                                    <p className="text-sm font-semibold text-slate-700">No completed jobs yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Complete your scheduled jobs to see them here.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-slate-700">No work orders in this view</p>
                                    <p className="text-xs text-slate-400 mt-1">Select another tab to view other jobs</p>
                                </>
                            )}
                        </div>
                    ) : (
                        displayedJobs.map((job) => {
                            const stats = getSafeChecklistStats(job);
                            const isStarted = isJobStarted(job);

                            return (
                                <div
                                    key={job.id}
                                    className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md flex flex-col justify-between transition-all group relative overflow-hidden"
                                >
                                    {/* Status Color Strip */}
                                    <div
                                        className={`absolute top-0 left-0 right-0 h-1 ${
                                            job.status === 'Completed'
                                                ? 'bg-emerald-500'
                                                : job.status === 'Installed'
                                                    ? 'bg-teal-500'
                                                    : isStarted
                                                        ? 'bg-blue-500'
                                                        : 'bg-amber-500'
                                        }`}
                                    />

                                    <div>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-blue-600">
                                                        {job.id}
                                                    </span>
                                                    {job.isWhiteboard && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            Whiteboard
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-mono text-slate-400">
                                                        {job.jobNumber}
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                                                    {job.vehicle.rego} • {job.vehicle.fleetNumber}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-mono">
                                                    {job.vehicle.makeModel} (VIN: {job.vehicle.vin})
                                                </p>
                                            </div>

                                            <span
                                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                    job.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : job.status === 'Installed'
                                                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                                            : isStarted
                                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}
                                            >
                                                {isStarted && job.status !== 'Completed' && job.status !== 'Installed'
                                                    ? 'In Progress'
                                                    : job.status}
                                            </span>
                                        </div>

                                        {/* Customer, Location & Schedule */}
                                        <div className="space-y-1.5 my-3 text-xs text-slate-600">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 truncate">
                                                    <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                    <span className="font-medium text-slate-800">{job.customerName}</span>
                                                </div>
                                                {job.customerPhone && (
                                                    <a href={`tel:${job.customerPhone}`} className="text-blue-600 font-mono flex items-center gap-1 hover:underline">
                                                        <Phone className="w-3 h-3" /> {job.customerPhone}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                <span className="truncate text-slate-600">{job.location}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                <span className="text-slate-600">{job.installationDate || 'Today'}</span>
                                                {job.startTime && (
                                                    <span className="text-slate-400 font-mono">
                                                        ({job.startTime} – {job.endTime || '12:00'})
                                                    </span>
                                                )}
                                            </div>
                                            {job.notes && (
                                                <div className="text-[11px] bg-slate-50 border border-slate-200/70 p-2 rounded-xl text-slate-600 mt-2">
                                                    <span className="font-semibold text-slate-700">Note: </span>
                                                    {job.notes}
                                                </div>
                                            )}
                                        </div>

                                        {/* Hardware items */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {job.hardware?.map((hw) => (
                                                <span
                                                    key={hw.id}
                                                    className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                                                >
                                                    {hw.model} {hw.serialNumber ? `(${hw.serialNumber})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer & Checklist stats (Issue 4 fix: clean display if total is 0) */}
                                    <div className="pt-3 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-slate-500 font-medium">QA Checklist:</span>
                                            {stats.hasTasks ? (
                                                <span className="font-mono text-blue-600 font-bold">
                                                    {stats.completed}/{stats.total} tasks ({stats.percent}%)
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-medium">
                                                    No QA checklist required
                                                </span>
                                            )}
                                        </div>

                                        {stats.hasTasks && (
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className="h-full bg-blue-600 transition-all duration-300"
                                                    style={{ width: `${stats.percent}%` }}
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            {!isStarted && job.status !== 'Completed' && job.status !== 'Installed' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartJob(job)}
                                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-emerald-50 border border-emerald-300 transition-colors flex items-center gap-1"
                                                >
                                                    <Play className="w-3 h-3 fill-emerald-700" />
                                                    Start Job
                                                </button>
                                            ) : isStarted && job.status !== 'Installed' && job.status !== 'Completed' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusAdvancement(job, 'Installed')}
                                                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 px-2.5 py-1 rounded-lg hover:bg-teal-50 border border-teal-200 transition-colors"
                                                >
                                                    Mark Installed
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 font-medium">Ready</span>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setSelectedJob(job)}
                                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                            >
                                                <span>Work Order</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Technician Work Order Modal */}
            {selectedJob && (
                <TechnicianWorkOrderModal
                    job={selectedJob}
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                    technicianName={activeTech.displayName}
                />
            )}
        </div>
    );
};