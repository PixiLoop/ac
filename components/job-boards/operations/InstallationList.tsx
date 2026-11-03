import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InstallationJob, InstallationStatus, HardwareModel } from '../types/installation';
import { StatusBadge, ScheduleBadge, JobSourceBadge, getJobSource, JobSource } from './shared/StatusBadge';
import { ChecklistProgress } from './shared/ChecklistProgress';
import { JobScheduleCard } from './shared/JobScheduleCard';
import { ScheduleJobDialog } from './ScheduleJobDialog';
import { StatusChangeDialog } from './StatusChangeDialog';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowRight,
  CheckCircle2,
  CalendarCheck,
  ChevronRight,
  X,
  Layers,
  Layout,
  Cpu,
  ShoppingBag,
} from 'lucide-react';
import { useOperations } from '../../../providers/OperationsContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../../ui/toast';

const BOARD_STATUSES: InstallationStatus[] = [
  'Not Actioned',
  'Workshop Setup',
  'Waiting Install',
  'Installed',
  'Invoiced',
  'Completed',
];

type SourceFilter = 'All' | 'Whiteboard' | 'FM Pre-Installation' | 'Sales Order';

type SearchSuggestion = {
  value: string;
  label: string;
  kind: 'Job' | 'Customer' | 'Technician' | 'Rego' | 'Fleet' | 'Source';
  jobId?: string;
};

export const InstallationList: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    jobs,
    technicians,
    customers,
    projects,
    statusFilter,
    setStatusFilter,
    scheduleStatusFilter,
    setScheduleStatusFilter,
    technicianFilter,
    setTechnicianFilter,
    searchQuery,
    setSearchQuery,
    installationsViewMode,
    setInstallationsViewMode,
    setSelectedJobId,
    getStatusCounts,
    getChecklistStats,
    createInstallationJob,
    changeJobStatus,
  } = useOperations();

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All');
  const [schedulingJob, setSchedulingJob] = useState<InstallationJob | null>(null);
  const [statusChangingJob, setStatusChangingJob] = useState<InstallationJob | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const dropInFlightRef = useRef<string | null>(null);

  const sourceCounts = useMemo((): Record<SourceFilter, number> => {
    const counts: Record<SourceFilter, number> = {
      'All': jobs.length,
      'Whiteboard': 0,
      'FM Pre-Installation': 0,
      'Sales Order': 0,
    };
    for (const job of jobs) {
      const src = getJobSource(job);
      if (src in counts) {
        counts[src]++;
      }
    }
    return counts;
  }, [jobs]);

  const resolveTechName = (job: InstallationJob) => {
    const fromJob =
      job.technicianName && job.technicianName !== job.technicianId
        ? job.technicianName
        : '';
    if (fromJob) return fromJob;
    const tech = job.technicianId
      ? technicians.find((t) => t.id === job.technicianId)
      : undefined;
    return (
      tech?.displayName ||
      `${tech?.firstName ?? ''} ${tech?.lastName ?? ''}`.trim() ||
      ''
    );
  };

  const jobMatchesQuery = (job: InstallationJob, qRaw: string) => {
    const q = qRaw.trim().toLowerCase();
    if (!q) return true;
    const techName = resolveTechName(job).toLowerCase();
    const sourceName = getJobSource(job).toLowerCase();
    const haystacks = [
      job.id,
      job.jobNumber,
      job.customerName,
      job.location,
      job.vehicle?.rego,
      job.vehicle?.fleetNumber,
      job.vehicle?.vin,
      job.vehicle?.makeModel,
      techName,
      job.technicianId,
      sourceName,
      job.notes,
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    return haystacks.some((h) => h.includes(q));
  };

  // Drag and Drop State for Kanban Board
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<InstallationStatus | null>(null);
  const [dropNotice, setDropNotice] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Drag and Drop handlers
  const handleCardDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedJobId(jobId);
  };

  const handleCardDragEnd = () => {
    setDraggedJobId(null);
    setDragOverColumn(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnStatus: InstallationStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, newStatus: InstallationStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
    setDraggedJobId(null);

    if (!jobId) return;

    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob || targetJob.status === newStatus) return;

    const flightKey = `${jobId}->${newStatus}`;
    if (dropInFlightRef.current === flightKey) return;
    dropInFlightRef.current = flightKey;

    const prevStatus = targetJob.status;
    try {
      const res = await changeJobStatus(
        jobId,
        newStatus,
        `Status updated from "${prevStatus}" to "${newStatus}" via Board Drag & Drop`,
        'Dispatcher',
        true,
      );

      if (res.success) {
        setDropNotice({
          message: `${targetJob.id} moved to "${newStatus}"`,
          type: 'success',
        });
        showToast({
          type: 'success',
          title: `Status → ${newStatus}`,
          replace: true,
        });
        setTimeout(() => setDropNotice(null), 3500);
      } else {
        showToast({
          type: 'error',
          title: (res as any).message || 'Could not update status',
          replace: true,
        });
      }
    } finally {
      dropInFlightRef.current = null;
    }
  };

  // Form state for creating a new job
  const [newCustId, setNewCustId] = useState<string>(customers[0]?.id || '');
  const [newProjId, setNewProjId] = useState<string>(projects[0]?.id || '');
  const [newLocation, setNewLocation] = useState<string>('Sydney Central Depot — Bay 1');
  const [newRego, setNewRego] = useState<string>('XY-99-ZZ');
  const [newFleet, setNewFleet] = useState<string>('TRUCK-501');
  const [newVin, setNewVin] = useState<string>('1HD1KRE12FB998811');
  const [newMake, setNewMake] = useState<string>('Kenworth T610');
  const [selectedHwList, setSelectedHwList] = useState<HardwareModel[]>(['MIX4000', 'HD Camera', 'SIM']);

  const statusCounts = getStatusCounts();

  const statuses: (InstallationStatus | 'All')[] = [
    'All',
    'Not Actioned',
    'Workshop Setup',
    'Waiting Install',
    'Installed',
    'Invoiced',
    'Completed',
  ];

  // Filtering
  const filteredJobs = jobs.filter((job) => {
    // Source filter
    if (sourceFilter !== 'All') {
      const src = getJobSource(job);
      if (src !== sourceFilter) return false;
    }

    // Status filter
    if (statusFilter !== 'All' && job.status !== statusFilter) return false;

    // Schedule status filter
    if (scheduleStatusFilter === 'Scheduled' && !job.isScheduled) return false;
    if (scheduleStatusFilter === 'Unscheduled' && job.isScheduled) return false;

    // Technician filter
    if (technicianFilter !== 'All' && job.technicianId !== technicianFilter) return false;

    if (!jobMatchesQuery(job, searchQuery)) return false;

    return true;
  });

  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 1) return [];

    const seen = new Set<string>();
    const out: SearchSuggestion[] = [];
    const push = (s: SearchSuggestion) => {
      const key = `${s.kind}:${s.value.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(s);
    };

    for (const job of jobs) {
      const techName = resolveTechName(job);
      if (job.id.toLowerCase().includes(q) || (job.jobNumber || '').toLowerCase().includes(q)) {
        push({
          kind: 'Job',
          value: job.id,
          label: `${job.id}${job.jobNumber ? ` · ${job.jobNumber}` : ''} — ${job.customerName}`,
          jobId: job.id,
        });
      }
      if (job.customerName?.toLowerCase().includes(q)) {
        push({
          kind: 'Customer',
          value: job.customerName,
          label: job.customerName,
          jobId: job.id,
        });
      }
      if (techName && techName.toLowerCase().includes(q)) {
        push({
          kind: 'Technician',
          value: techName,
          label: techName,
          jobId: job.id,
        });
      }
      if (job.vehicle?.rego?.toLowerCase().includes(q)) {
        push({
          kind: 'Rego',
          value: job.vehicle.rego,
          label: `${job.vehicle.rego} · ${job.customerName}`,
          jobId: job.id,
        });
      }
      if (job.vehicle?.fleetNumber?.toLowerCase().includes(q)) {
        push({
          kind: 'Fleet',
          value: job.vehicle.fleetNumber,
          label: `${job.vehicle.fleetNumber} · ${job.customerName}`,
          jobId: job.id,
        });
      }
      if (out.length >= 12) break;
    }

    // Also suggest technicians not yet matched via job name resolution
    for (const t of technicians) {
      const name =
        t.displayName ||
        `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() ||
        t.email ||
        '';
      if (name && name.toLowerCase().includes(q)) {
        push({ kind: 'Technician', value: name, label: name });
      }
      if (out.length >= 12) break;
    }

    return out.slice(0, 12);
  }, [searchQuery, jobs, technicians]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const applySuggestion = (s: SearchSuggestion) => {
    setSearchQuery(s.value);
    setSearchOpen(false);
    if (s.jobId && (s.kind === 'Job' || s.kind === 'Rego')) {
      setSelectedJobId(s.jobId);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === newCustId);
    const proj = projects.find((p) => p.id === newProjId);

    const createdId = await createInstallationJob({
      jobNumber: `JOB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: newCustId,
      assignedTo: "technician",
      customerName: cust ? cust.name : 'ABC Transport Pty Ltd',
      customerContact: cust?.contactPerson,
      customerPhone: cust?.phone,
      projectId: newProjId,
      projectName: proj ? proj.name : 'Fleet Overhaul',
      location: newLocation,
      vehicle: {
        rego: newRego,
        fleetNumber: newFleet,
        vin: newVin,
        makeModel: newMake,
      },
      hardware: selectedHwList.map((m, idx) => ({
        id: `hw-new-${idx}-${Date.now()}`,
        model: m,
        name: `${m} Telematics Component`,
        serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
        category:
          m === 'MIX4000' || m === 'FM3306'
            ? 'Telematics Unit'
            : m === 'HD Camera' || m === 'Standard Camera'
            ? 'Camera & Video'
            : m === 'SIM'
            ? 'Connectivity'
            : 'Sensors',
      })),
      isScheduled: false,
      status: 'Not Actioned',
      notes: 'Freshly raised work order. [Whiteboard Job]',
      isWhiteboard: true,
      jobType: 'Whiteboard',
      jobSource: 'Whiteboard',
      sourceType: 'WHITEBOARD',
    });

    setShowCreateModal(false);
    setSelectedJobId(createdId);
  };

  const toggleHardwareSelect = (m: HardwareModel) => {
    setSelectedHwList((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  return (
    <div className="w-full max-w-none space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Installation Jobs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track hardware fitting, auto-generated checklists, technician assignments, and progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle (List vs Board) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setInstallationsViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                installationsViewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setInstallationsViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                installationsViewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Installation
          </button>
        </div>
      </div>

      {/* Status Counters Tab Bar (Requirement #29) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {statuses.map((st) => {
            const count = statusCounts[st] || 0;
            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Source Quick Filter Pills Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 flex-wrap min-w-max">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1 pl-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Source:
            </span>

            {/* All Jobs */}
            <button
              onClick={() => setSourceFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                sourceFilter === 'All'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Jobs</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  sourceFilter === 'All'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sourceCounts['All']}
              </span>
            </button>

            {/* Whiteboard Jobs */}
            <button
              onClick={() => setSourceFilter('Whiteboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                sourceFilter === 'Whiteboard'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50/70 text-purple-700 hover:bg-purple-100/70 border border-purple-200/80'
              }`}
            >
              <Layout className="w-3.5 h-3.5 text-purple-500" />
              <span>Whiteboard Jobs</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  sourceFilter === 'Whiteboard'
                    ? 'bg-purple-800 text-white'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {sourceCounts['Whiteboard']}
              </span>
            </button>

            {/* FM Pre-Installation Jobs */}
            <button
              onClick={() => setSourceFilter('FM Pre-Installation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                sourceFilter === 'FM Pre-Installation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50/70 text-blue-700 hover:bg-blue-100/70 border border-blue-200/80'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              <span>FM Pre-Installation Jobs</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  sourceFilter === 'FM Pre-Installation'
                    ? 'bg-blue-800 text-white'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {sourceCounts['FM Pre-Installation']}
              </span>
            </button>

            {/* Sales Order Jobs */}
            <button
              onClick={() => setSourceFilter('Sales Order')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                sourceFilter === 'Sales Order'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200/80'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sales Order Jobs</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  sourceFilter === 'Sales Order'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {sourceCounts['Sales Order']}
              </span>
            </button>
          </div>

          {sourceFilter !== 'All' && (
            <button
              onClick={() => setSourceFilter('All')}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors px-2 py-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Source Filter
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search + autocomplete */}
        <div className="relative sm:col-span-2 lg:col-span-2" ref={searchWrapRef}>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (!searchOpen || !searchSuggestions.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, searchSuggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                applySuggestion(searchSuggestions[highlightIdx] || searchSuggestions[0]);
              } else if (e.key === 'Escape') {
                setSearchOpen(false);
              }
            }}
            placeholder="Search job ID, customer, technician (e.g. pra), rego..."
            autoComplete="off"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          {searchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              {searchSuggestions.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-slate-400">No matches</div>
              ) : (
                searchSuggestions.map((s, idx) => (
                  <button
                    key={`${s.kind}-${s.value}-${idx}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySuggestion(s);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 border-b border-slate-50 last:border-0 ${
                      idx === highlightIdx ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {s.kind}
                    </span>
                    <span className="text-slate-800 font-medium truncate">{s.label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Source Filter Dropdown */}
        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="All">Source: All Jobs ({sourceCounts['All']})</option>
            <option value="Whiteboard">Source: Whiteboard Jobs ({sourceCounts['Whiteboard']})</option>
            <option value="FM Pre-Installation">Source: FM Pre-Installation Jobs ({sourceCounts['FM Pre-Installation']})</option>
            <option value="Sales Order">Source: Sales Order Jobs ({sourceCounts['Sales Order']})</option>
          </select>
        </div>

        {/* Schedule Status Filter (Requirement #34) */}
        <div>
          <select
            value={scheduleStatusFilter}
            onChange={(e) => setScheduleStatusFilter(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Schedule: All</option>
            <option value="Scheduled">Schedule: Scheduled Only</option>
            <option value="Unscheduled">Schedule: Unscheduled Only</option>
          </select>
        </div>

        {/* Technician Filter (Requirement #13) */}
        <div>
          <select
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Technician: All Installers</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName} ({t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: List View or Board View */}
      {installationsViewMode === 'list' ? (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Job / Vehicle</th>
                  <th className="py-3.5 px-4">Customer & Depot</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Installer</th>
                  <th className="py-3.5 px-4">Schedule Date & Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Checklist Progress</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No installation jobs match your current filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const stats = getChecklistStats(job);

                    return (
                      <tr
                        key={job.id}
                        onClick={() => {
                          setSelectedJobId(job.id);
                          router.push(`/job-boards/job/${job.id}`);
                        }}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                      >
                        {/* Job ID & Vehicle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600">
                              {job.id}
                            </span>
                            <ScheduleBadge isScheduled={job.isScheduled} />
                          </div>
                          <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                            {job.vehicle.rego} • {job.vehicle.makeModel}
                          </p>
                        </td>

                        {/* Customer & Location */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 line-clamp-1">
                            {job.customerName}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {job.location}
                          </p>
                        </td>

                        {/* Job Source */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <JobSourceBadge source={getJobSource(job)} />
                        </td>

                        {/* Assigned to */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 line-clamp-1">
                            {job.assignedTo === "technician" && "Technician"}
                            {job.assignedTo === "contractor" && "Contractor"}
                            {job.assignedTo === "subcontractor" && "Sub-Contractor"}
                          </p>
                        </td>

                        {/* Installer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-800">
                              {job.technicianName || (
                                <span className="text-amber-600 italic">Unassigned</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Schedule Date & Time */}
                        <td className="py-3.5 px-4">
                          {job.installationDate ? (
                            <div>
                              <div className="font-medium text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {job.installationDate}
                              </div>
                              {job.startTime && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {job.startTime} – {job.endTime}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not Booked</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={job.status} />
                        </td>

                        {/* Checklist */}
                        <td className="py-3.5 px-4 min-w-[150px]">
                          <ChecklistProgress stats={stats} compact={true} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSchedulingJob(job)}
                              title="Schedule / Reschedule"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <CalendarCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setStatusChangingJob(job)}
                              title="Update Status"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedJobId(job.id);
                                router.push(`/job-boards/job/${job.id}`);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN / BOARD VIEW — drag cards between columns to change status */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Drag a job card onto another column to update its status
            </span>
            {draggedJobId && (
              <span className="text-blue-600 font-semibold animate-pulse">
                Dragging {draggedJobId} • Drop into target phase
              </span>
            )}
          </div>

          <div className="overflow-x-auto pb-2 scrollbar-hover-thin">
            <div className="grid grid-cols-6 gap-2 min-w-[1120px]">
              {BOARD_STATUSES.map((columnStatus) => {
                const columnJobs = filteredJobs.filter((j) => j.status === columnStatus);
                const isOver = dragOverColumn === columnStatus;

                return (
                  <div
                    key={columnStatus}
                    onDragOver={(e) => handleColumnDragOver(e, columnStatus)}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={(e) => handleColumnDrop(e, columnStatus)}
                    className={`rounded-xl p-1.5 border transition-all flex flex-col max-h-[78vh] min-w-0 ${
                      isOver
                        ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-md'
                        : 'bg-slate-100/60 border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 px-1 pb-1.5 mb-1.5 border-b border-slate-200/80">
                      <span className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                        {columnStatus}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shrink-0 tabular-nums">
                        {columnJobs.length}
                      </span>
                    </div>

                    {isOver && (
                      <div className="mb-1.5 py-1.5 px-2 border border-dashed border-blue-400 bg-white/90 rounded-lg text-center text-[11px] font-bold text-blue-600 animate-pulse">
                        Drop to move to {columnStatus}
                      </div>
                    )}

                    <div className="overflow-y-auto space-y-1.5 pr-0.5 flex-1 min-h-[120px] scrollbar-hover-thin">
                      {columnJobs.length === 0 ? (
                        <div
                          className={`px-2 py-5 text-center text-[11px] rounded-lg border border-dashed transition-colors ${
                            isOver
                              ? 'border-blue-300 bg-white/60 text-blue-600 font-medium'
                              : 'border-slate-200/80 text-slate-400'
                          }`}
                        >
                          {isOver ? 'Release to set status' : 'Drop jobs here'}
                        </div>
                      ) : (
                        columnJobs.map((job) => (
                          <JobScheduleCard
                            key={job.id}
                            job={job}
                            hideStatus
                            draggable
                            isDragging={draggedJobId === job.id}
                            onDragStart={(e) => handleCardDragStart(e, job.id)}
                            onDragEnd={handleCardDragEnd}
                            onClick={() => {
                              setSelectedJobId(job.id);
                              router.push(`/job-boards/job/${job.id}`);
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Drag & Drop Toast */}
      {dropNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{dropNotice.message}</span>
        </div>
      )}

      {/* Schedule Dialog */}
      {schedulingJob && (
        <ScheduleJobDialog
          job={schedulingJob}
          isOpen={!!schedulingJob}
          onClose={() => setSchedulingJob(null)}
        />
      )}

      {/* Status Change Dialog */}
      {statusChangingJob && (
        <StatusChangeDialog
          job={statusChangingJob}
          isOpen={!!statusChangingJob}
          onClose={() => setStatusChangingJob(null)}
        />
      )}

      {/* New Installation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Create Installation Job</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Customer
                </label>
                <select
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Project
                </label>
                <select
                  value={newProjId}
                  onChange={(e) => setNewProjId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Vehicle Rego
                  </label>
                  <input
                    type="text"
                    value={newRego}
                    onChange={(e) => setNewRego(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Fleet Number
                  </label>
                  <input
                    type="text"
                    value={newFleet}
                    onChange={(e) => setNewFleet(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Installation Depot Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
                  required
                />
              </div>

              {/* Hardware Selection (Demonstrating requirement #1 & #6) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Select Hardware Components (Auto-attaches Checklists)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'MIX4000',
                      'FM3306',
                      'HD Camera',
                      'Standard Camera',
                      'SIM',
                      'GPS Unit',
                      'Base Unit',
                    ] as HardwareModel[]
                  ).map((model) => {
                    const isSelected = selectedHwList.includes(model);
                    return (
                      <button
                        type="button"
                        key={model}
                        onClick={() => toggleHardwareSelect(model)}
                        className={`p-2 rounded-xl text-xs font-semibold border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{model}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting hardware will generate the combined installation checklist sections.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedHwList.length === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  Create & Generate Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
