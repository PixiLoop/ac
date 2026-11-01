'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InstallationJob, InstallationStatus } from '../types/installation';
import { useOperations } from '../../../providers/OperationsContext';
import { RescheduleDialog } from './RescheduleDialog';
import { useToast } from '../../ui/toast';
import {
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  Settings,
  Wrench,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';

/** MQ calendar statuses — exact labels/colors from shared mock */
type MqStatus =
  | 'New'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Despatched'
  | 'Invoiced'
  | 'Cancelled';

type MqJobType = 'Repair' | 'Install' | 'Service' | 'Inspection';

type CalendarView =
  | 'week'
  | 'day'
  | 'month'
  | 'year'
  | 'team'
  | 'byStatus'
  | 'byJobType';

const MQ_STATUSES: MqStatus[] = [
  'New',
  'In Progress',
  'On Hold',
  'Completed',
  'Despatched',
  'Invoiced',
  'Cancelled',
];

const MQ_JOB_TYPES: MqJobType[] = ['Repair', 'Install', 'Service', 'Inspection'];

const MQ_STYLE: Record<
  MqStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  New: {
    bg: 'bg-[#E3F2FD]',
    border: 'border-[#90CAF9]',
    text: 'text-[#1565C0]',
    dot: 'bg-[#2196F3]',
  },
  'In Progress': {
    bg: 'bg-[#FFF8E1]',
    border: 'border-[#FFE082]',
    text: 'text-[#EF6C00]',
    dot: 'bg-[#FF9800]',
  },
  'On Hold': {
    bg: 'bg-[#FFEBEE]',
    border: 'border-[#EF9A9A]',
    text: 'text-[#C62828]',
    dot: 'bg-[#F44336]',
  },
  Completed: {
    bg: 'bg-[#E8F5E9]',
    border: 'border-[#A5D6A7]',
    text: 'text-[#2E7D32]',
    dot: 'bg-[#4CAF50]',
  },
  Despatched: {
    bg: 'bg-[#FCE4EC]',
    border: 'border-[#F48FB1]',
    text: 'text-[#AD1457]',
    dot: 'bg-[#E91E63]',
  },
  Invoiced: {
    bg: 'bg-[#EDE7F6]',
    border: 'border-[#B39DDB]',
    text: 'text-[#4527A0]',
    dot: 'bg-[#5E35B1]',
  },
  Cancelled: {
    bg: 'bg-[#F5F5F5]',
    border: 'border-[#BDBDBD]',
    text: 'text-[#424242]',
    dot: 'bg-[#616161]',
  },
};

/** Map installation job status → MQ status for calendar display */
function toMqStatus(status: InstallationStatus): MqStatus {
  switch (status) {
    case 'Not Actioned':
      return 'New';
    case 'Workshop Setup':
      return 'In Progress';
    case 'Waiting Install':
      return 'Despatched';
    case 'Installed':
      return 'Completed';
    case 'Invoiced':
      return 'Invoiced';
    case 'Completed':
      return 'Completed';
    default:
      return 'New';
  }
}

/** Map MQ status drop target → installation status */
function fromMqStatus(mq: MqStatus): InstallationStatus | null {
  switch (mq) {
    case 'New':
      return 'Not Actioned';
    case 'In Progress':
      return 'Workshop Setup';
    case 'On Hold':
      return 'Waiting Install';
    case 'Despatched':
      return 'Waiting Install';
    case 'Completed':
      return 'Completed';
    case 'Invoiced':
      return 'Invoiced';
    case 'Cancelled':
      return null;
    default:
      return null;
  }
}

/** Map job type → MQ job type label */
function toMqJobType(job: InstallationJob): MqJobType {
  const t = (job.jobType || 'Standard').toLowerCase();
  if (t.includes('whiteboard')) return 'Repair';
  if (t.includes('preinstall') || t.includes('fm')) return 'Service';
  if (t.includes('inspect')) return 'Inspection';
  return 'Install';
}

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function jobNumber(job: InstallationJob): string {
  return String(job.jobNumber || job.id.replace(/\D/g, '') || job.id);
}

function jobTitle(job: InstallationJob): string {
  return `${toMqJobType(job)} Job #${jobNumber(job)}`;
}

function jobDescription(job: InstallationJob): string {
  const n = jobNumber(job);
  const type = toMqJobType(job);
  if (job.customerName) return `${job.customerName} — ${type} for ${n}`;
  return `Detailed ${type} description for ${n}`;
}

function initials(name?: string | null): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Compact avatar so initials stay optically centered (avoids clipped/stretched text). */
function InitialsAvatar({
  name,
  size = 20,
  fontSize = 9,
}: {
  name?: string | null;
  size?: number;
  fontSize?: number;
}) {
  return (
    <span
      className="inline-grid place-items-center shrink-0 rounded-full bg-ink text-white font-bold select-none"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize,
        lineHeight: 1,
        letterSpacing: '0.02em',
      }}
      aria-hidden
    >
      <span style={{ lineHeight: 1, display: 'block', transform: 'translateY(0.5px)' }}>
        {initials(name)}
      </span>
    </span>
  );
}

function JobTypeIcon({
  type,
  className = 'w-3.5 h-3.5',
}: {
  type: MqJobType;
  className?: string;
}) {
  switch (type) {
    case 'Repair':
      return <Wrench className={className} aria-hidden />;
    case 'Install':
      return <Settings className={className} aria-hidden />;
    case 'Service':
      return <Wrench className={className} aria-hidden />;
    case 'Inspection':
      return <ClipboardCheck className={className} aria-hidden />;
    default:
      return <CheckCircle2 className={className} aria-hidden />;
  }
}

type ApiComment = {
  id: string;
  message: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string | null;
};

export const OperationsCalendar: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    jobs,
    technicians,
    setSelectedJobId,
    rescheduleJob,
    scheduleJob,
    changeJobStatus,
  } = useOperations();

  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [techFilter, setTechFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [selectedJob, setSelectedJob] = useState<InstallationJob | null>(null);
  const [rescheduleJobTarget, setRescheduleJobTarget] = useState<InstallationJob | null>(null);
  const [rescheduleTargets, setRescheduleTargets] = useState<{
    date?: string;
    start?: string;
    end?: string;
  }>({});

  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  /** Click legend status to highlight matching jobs (null = show all equally) */
  const [legendHighlight, setLegendHighlight] = useState<MqStatus | null>(null);
  /** Day "+N more" or Year month click — modal listing jobs */
  const [jobsListModal, setJobsListModal] = useState<{
    label: string;
    jobs: InstallationJob[];
    /** When true, group jobs by day (year → month click) */
    groupByDay?: boolean;
    /** Optional: jump to calendar month view */
    monthIndex?: number;
    year?: number;
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [apiComments, setApiComments] = useState<ApiComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const dropInFlightRef = useRef<string | null>(null);
  const didDragRef = useRef(false);

  // Keep sidebar job in sync after reschedule / status / refresh
  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((j) => j.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  }, [jobs, selectedJob?.id]);

  // Load threaded comments for the selected job
  useEffect(() => {
    if (!selectedJob) {
      setApiComments([]);
      setCommentText('');
      return;
    }
    let cancelled = false;
    setLoadingComments(true);
    setCommentText('');
    (async () => {
      try {
        const { data } = await api.get(`/comments/installation/${selectedJob.id}`);
        const list = (data?.data ?? data ?? []) as ApiComment[];
        if (!cancelled) setApiComments(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setApiComments([]);
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedJob?.id]);

  /** Show this many jobs in a month cell; if more, show total as "5+" and open modal */
  const MONTH_VISIBLE_JOBS = 2;
  /** Jobs shown per month card in year grid before "+N more" */
  const YEAR_VISIBLE_JOBS = 5;

  const formatMonthDay = (dateStr?: string) => {
    if (!dateStr || dateStr.length < 10) return '—';
    const [, mm, dd] = dateStr.split('-');
    return `${mm}-${dd}`;
  };

  const toggleLegendHighlight = (status: MqStatus) => {
    setLegendHighlight((prev) => (prev === status ? null : status));
  };

  const cardEmphasis = (mq: MqStatus) => {
    if (!legendHighlight) return 'opacity-100';
    if (mq === legendHighlight) return 'opacity-100 ring-2 ring-offset-1 ring-slate-800 scale-[1.01] z-[1] shadow-md';
    return 'opacity-30';
  };

  const searchQuery = search.trim().toLowerCase();
  const searchActive = searchQuery.length >= 3;
  const searchPending = searchQuery.length > 0 && searchQuery.length < 3;

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'All' ||
    techFilter !== 'All' ||
    typeFilter !== 'All' ||
    legendHighlight !== null ||
    calendarView !== 'week' ||
    formatDateString(currentDate) !== formatDateString(new Date());

  /** Reset to fresh open state (today, week view, no filters/search). */
  const clearAll = () => {
    setSearch('');
    setStatusFilter('All');
    setTechFilter('All');
    setTypeFilter('All');
    setLegendHighlight(null);
    setSelectedJob(null);
    setCurrentDate(new Date());
    setCalendarView('week');
    setJobsListModal(null);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.installationDate) return false;

      const mq = toMqStatus(job.status);
      const jt = toMqJobType(job);

      if (statusFilter !== 'All' && mq !== statusFilter) return false;
      if (techFilter !== 'All' && job.technicianId !== techFilter) return false;
      if (typeFilter !== 'All' && jt !== typeFilter) return false;

      if (searchActive) {
        const hay = [
          job.id,
          job.jobNumber,
          job.customerName,
          job.technicianName,
          job.location,
          job.vehicle?.rego,
          job.vehicle?.fleetNumber,
          mq,
          jt,
          jobTitle(job),
          jobDescription(job),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }

      return true;
    });
  }, [jobs, searchActive, searchQuery, statusFilter, techFilter, typeFilter]);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];
    const startDayIndex = (firstDay.getDay() + 6) % 7;
    for (let i = startDayIndex; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, dateStr: formatDateString(d), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, dateStr: formatDateString(d), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateStr: formatDateString(d), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayIndex = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayIndex);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return { date: day, dateStr: formatDateString(day) };
    });
  }, [currentDate]);

  const yearMonths = useMemo(() => {
    const year = currentDate.getFullYear();
    return Array.from({ length: 12 }, (_, month) => {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const count = filteredJobs.filter((j) => j.installationDate?.startsWith(prefix)).length;
      return {
        month,
        name: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' }),
        count,
      };
    });
  }, [currentDate, filteredJobs]);

  const shiftCurrentDate = (direction: -1 | 1) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      switch (calendarView) {
        case 'day':
          next.setDate(next.getDate() + direction);
          break;
        case 'month':
          next.setMonth(next.getMonth() + direction);
          break;
        case 'year':
          next.setFullYear(next.getFullYear() + direction);
          break;
        case 'week':
        case 'team':
        case 'byStatus':
        case 'byJobType':
        default:
          next.setDate(next.getDate() + direction * 7);
          break;
      }
      return next;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const selectJob = (job: InstallationJob) => {
    setSelectedJob(job);
    setSelectedJobId(job.id);
  };

  const openJob = (job: InstallationJob) => {
    router.push(`/job-boards/job/${job.id}`);
  };

  const openReschedule = (
    job: InstallationJob,
    targets?: { date?: string; start?: string; end?: string }
  ) => {
    setRescheduleTargets(targets || {});
    setRescheduleJobTarget(job);
  };

  const handleCardDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
    didDragRef.current = true;
    setDraggedJobId(jobId);
  };

  const handleCardDragEnd = () => {
    setDraggedJobId(null);
    setDragOverKey(null);
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  const handleZoneDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== key) setDragOverKey(key);
  };

  const handleZoneDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverKey(null);
    }
  };

  const resolveDraggedJob = (e: React.DragEvent): InstallationJob | null => {
    const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
    setDraggedJobId(null);
    setDragOverKey(null);
    if (!jobId) return null;
    return jobs.find((j) => j.id === jobId) || null;
  };

  const dropOnDate = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    const job = resolveDraggedJob(e);
    if (!job) return;
    if (job.installationDate === dateStr) return;

    const start = job.startTime || '09:00';
    const end = job.endTime || '10:00';
    const flightKey = `${job.id}->date:${dateStr}`;
    if (dropInFlightRef.current === flightKey) return;
    dropInFlightRef.current = flightKey;

    try {
      const res = await rescheduleJob(job.id, dateStr, start, end);
      if (res.success) {
        showToast({ type: 'success', title: `Moved to ${dateStr}`, replace: true });
        setSelectedJob((prev) =>
          prev?.id === job.id
            ? { ...prev, installationDate: dateStr, startTime: start, endTime: end }
            : prev
        );
      } else {
        // Direct drag only — no reschedule popup; toast the reason
        showToast({
          type: 'error',
          title: res.conflict?.message || 'Could not reschedule',
          replace: true,
        });
      }
    } finally {
      dropInFlightRef.current = null;
    }
  };

  const dropOnTeam = async (e: React.DragEvent, technicianId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const job = resolveDraggedJob(e);
    if (!job) return;

    if (!technicianId) {
      showToast({ type: 'info', title: 'Drop onto a technician to reassign', replace: true });
      return;
    }
    if (job.technicianId === technicianId) return;

    const date = job.installationDate || formatDateString(currentDate);
    const start = job.startTime || '09:00';
    const end = job.endTime || '10:00';
    const flightKey = `${job.id}->tech:${technicianId}`;
    if (dropInFlightRef.current === flightKey) return;
    dropInFlightRef.current = flightKey;

    try {
      const res = await scheduleJob(job.id, "technician", technicianId, date, start, end, 'Reassigned via calendar drag & drop');
      if (res.success) {
        const tech = technicians.find((t) => t.id === technicianId);
        showToast({
          type: 'success',
          title: `Assigned to ${tech?.displayName || 'technician'}`,
          replace: true,
        });
      } else {
        showToast({
          type: 'error',
          title: res.conflict?.message || 'Could not reassign technician',
          replace: true,
        });
      }
    } finally {
      dropInFlightRef.current = null;
    }
  };

  const dropOnStatus = async (e: React.DragEvent, mq: MqStatus) => {
    e.preventDefault();
    e.stopPropagation();
    const job = resolveDraggedJob(e);
    if (!job) return;

    const newStatus = fromMqStatus(mq);
    if (!newStatus) {
      showToast({ type: 'info', title: 'Cancelled status is not available', replace: true });
      return;
    }
    if (job.status === newStatus) return;

    const flightKey = `${job.id}->status:${newStatus}`;
    if (dropInFlightRef.current === flightKey) return;
    dropInFlightRef.current = flightKey;

    try {
      const res = await changeJobStatus(
        job.id,
        newStatus,
        `Status updated to "${newStatus}" via calendar drag & drop`,
        'Dispatcher',
        true
      );
      if (res.success) {
        showToast({ type: 'success', title: `Status → ${mq}`, replace: true });
      } else {
        showToast({
          type: 'error',
          title: (res as { message?: string }).message || 'Could not update status',
          replace: true,
        });
      }
    } finally {
      dropInFlightRef.current = null;
    }
  };

  const views: { id: CalendarView; label: string }[] = [
    { id: 'week', label: 'Week' },
    { id: 'day', label: 'Day' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'team', label: 'Team' },
    { id: 'byStatus', label: 'By Status' },
    { id: 'byJobType', label: 'By Job Type' },
  ];

  const JobCard = ({ job }: { job: InstallationJob }) => {
    const mq = toMqStatus(job.status);
    const style = MQ_STYLE[mq];
    const jt = toMqJobType(job);
    const time =
      job.startTime && job.endTime
        ? `${job.startTime} – ${job.endTime}`
        : job.startTime || 'TBD';
    const selected = selectedJob?.id === job.id;
    const dragging = draggedJobId === job.id;
    const highlight = legendHighlight === mq;
    const dimmed = !!legendHighlight && !highlight;
    const techName = job.technicianName || 'Unassigned';

    return (
      <div
        draggable
        onDragStart={(e) => handleCardDragStart(e, job.id)}
        onDragEnd={handleCardDragEnd}
        onClick={() => {
          if (didDragRef.current) return;
          selectJob(job);
        }}
        onDoubleClick={() => openJob(job)}
        className={`w-full text-left rounded-md border px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all ${style.bg} ${style.border} ${
          selected ? 'ring-2 ring-slate-500 ring-offset-1' : ''
        } ${dragging ? 'opacity-50' : cardEmphasis(mq)} ${
          highlight && !selected ? 'ring-2 ring-offset-1 ring-slate-800' : ''
        } ${dimmed ? 'pointer-events-auto' : ''}`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <p className={`text-[11px] font-semibold leading-snug min-w-0 ${style.text}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${style.dot}`} />
            {time}
          </p>
          <span className={`inline-flex items-center gap-1 shrink-0 text-[10px] font-bold ${style.text}`}>
            <JobTypeIcon type={jt} className="w-3.5 h-3.5" />
            <span className="truncate max-w-[72px]">{jt}</span>
          </span>
        </div>
        <p className="text-[11px] font-bold text-slate-900 mt-1 truncate">
          #{jobNumber(job)} · {jt} Job
        </p>
        <p className="text-[10px] text-slate-600 mt-1 line-clamp-2 leading-snug">{jobDescription(job)}</p>
        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
          <InitialsAvatar
            name={techName === 'Unassigned' ? null : techName}
            size={20}
            fontSize={9}
          />
          <span className="text-[10px] font-semibold text-ink truncate leading-none">
            {techName}
          </span>
        </div>
      </div>
    );
  };

  /** Compact vertical job chip for month day cells */
  const MonthPill = ({ job }: { job: InstallationJob }) => {
    const mq = toMqStatus(job.status);
    const style = MQ_STYLE[mq];
    const jt = toMqJobType(job);
    const dragging = draggedJobId === job.id;
    const time = job.startTime || '';
    return (
      <div
        draggable
        onDragStart={(e) => handleCardDragStart(e, job.id)}
        onDragEnd={handleCardDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          if (didDragRef.current) return;
          selectJob(job);
        }}
        title={`${time} ${jt} #${jobNumber(job)} · ${job.technicianName || 'Unassigned'}`}
        className={`w-full text-left rounded border overflow-hidden cursor-grab active:cursor-grabbing transition-all ${style.bg} ${style.border} ${
          dragging ? 'opacity-50' : cardEmphasis(mq)
        }`}
      >
        <div className="flex items-stretch">
          <div className={`w-[3px] shrink-0 ${style.dot}`} />
          <div className="flex-1 min-w-0 px-1.5 py-1 flex flex-col gap-0.5">
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold leading-none truncate ${style.text}`}>
              <JobTypeIcon type={jt} className="w-2.5 h-2.5 shrink-0" />
              {time ? `${time} · ` : ''}
              {jt}
            </span>
            <span className="text-[9px] text-slate-800 font-medium leading-none truncate">
              #{jobNumber(job)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const JobsListModal = () => {
    if (!jobsListModal) return null;
    const { label, jobs: modalJobs, groupByDay } = jobsListModal;

    const sorted = [...modalJobs].sort((a, b) => {
      const d = (a.installationDate || '').localeCompare(b.installationDate || '');
      if (d !== 0) return d;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const dayGroups = groupByDay
      ? sorted.reduce<Record<string, InstallationJob[]>>((acc, job) => {
          const key = job.installationDate || 'Unscheduled';
          if (!acc[key]) acc[key] = [];
          acc[key].push(job);
          return acc;
        }, {})
      : null;

    const dayKeys = dayGroups ? Object.keys(dayGroups).sort() : [];

    const formatDayHeading = (dateStr: string) => {
      if (dateStr === 'Unscheduled') return dateStr;
      const d = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        onClick={() => setJobsListModal(null)}
      >
        <div
          className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 leading-normal">
                Jobs for {label}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                {sorted.length} job{sorted.length === 1 ? '' : 's'}
                {groupByDay && dayKeys.length > 0
                  ? ` · ${dayKeys.length} day${dayKeys.length === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setJobsListModal(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {groupByDay && dayGroups ? (
              dayKeys.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No jobs this month.</p>
              ) : (
                dayKeys.map((day) => (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <p className="text-xs font-semibold text-slate-800 leading-normal">
                        {formatDayHeading(day)}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {dayGroups[day].length} job
                        {dayGroups[day].length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {dayGroups[day].map((job) => (
                        <div
                          key={job.id}
                          onClick={() => {
                            selectJob(job);
                            setJobsListModal(null);
                          }}
                        >
                          <JobCard job={job} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="flex flex-col gap-2.5">
                {sorted.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => {
                      selectJob(job);
                      setJobsListModal(null);
                    }}
                  >
                    <JobCard job={job} />
                  </div>
                ))}
                {sorted.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">No jobs for this day.</p>
                )}
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
            {groupByDay && jobsListModal.monthIndex != null && (
              <button
                type="button"
                onClick={() => {
                  const y = jobsListModal.year ?? currentDate.getFullYear();
                  setCurrentDate(new Date(y, jobsListModal.monthIndex!, 1));
                  setCalendarView('month');
                  setJobsListModal(null);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Open month view
              </button>
            )}
            <button
              type="button"
              onClick={() => setJobsListModal(null)}
              className="ml-auto px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const postComment = async () => {
    if (!selectedJob || !commentText.trim() || postingComment) return;
    const message = commentText.trim();
    setPostingComment(true);
    try {
      const res = await api.post('/comments', {
        entityType: 'installation',
        entityId: selectedJob.id,
        message,
      });
      const data = (res.data?.data ?? res.data) as ApiComment;
      if (data?.id) {
        setApiComments((prev) =>
          prev.some((c) => c.id === data.id) ? prev : [...prev, data]
        );
      } else {
        setApiComments((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            message,
            createdAt: new Date().toISOString(),
            createdByName: 'You',
          },
        ]);
      }
      setCommentText('');
      showToast({ type: 'success', title: 'Comment posted', replace: true });
    } catch {
      showToast({ type: 'error', title: 'Could not post comment', replace: true });
    } finally {
      setPostingComment(false);
    }
  };

  const DetailSidebar = () => {
    if (!selectedJob) return null;
    const job = selectedJob;
    const mq = toMqStatus(job.status);
    const style = MQ_STYLE[mq];
    const jt = toMqJobType(job);
    const techName = job.technicianName || 'Unassigned';

    type SidebarComment = {
      id: string;
      message: string;
      author: string;
      at?: string;
      kind: 'comment' | 'activity';
    };

    const activity: SidebarComment[] = (job.timeline || [])
      .slice()
      .map((t) => {
        const note = typeof t.note === 'string' ? t.note.trim() : '';
        const message =
          note ||
          [typeof t.status === 'string' ? t.status : '', typeof t.updatedBy === 'string' ? t.updatedBy : '']
            .filter(Boolean)
            .join(' · ');
        return {
          id: t.id || `tl-${t.timestamp}`,
          message,
          author: t.updatedBy || 'System',
          at: t.timestamp,
          kind: 'activity' as const,
        };
      })
      .filter((c) => c.message);

    if (typeof job.notes === 'string' && job.notes.trim()) {
      activity.unshift({
        id: 'job-notes',
        message: job.notes.trim(),
        author: 'Notes',
        kind: 'activity',
      });
    }

    const thread: SidebarComment[] = apiComments.map((c) => ({
      id: c.id,
      message: c.message,
      author: c.createdByName || 'User',
      at: c.createdAt,
      kind: 'comment' as const,
    }));

    const feed = [...activity, ...thread].sort((a, b) =>
      String(a.at || '').localeCompare(String(b.at || ''))
    );

    return (
      <aside className="w-full lg:w-[300px] shrink-0 border border-slate-200 bg-white rounded-md p-4 flex flex-col gap-4 self-stretch lg:self-auto lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium leading-normal truncate">
              {job.id}
            </p>
            <h2 className="text-[15px] font-semibold text-slate-900 leading-normal mt-1 break-words">
              {jobTitle(job)}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSelectedJob(null)}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 leading-normal shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
            {mq}
          </span>
          <span className="text-slate-400">·</span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <JobTypeIcon type={jt} className="w-3.5 h-3.5 text-ink" />
            {jt}
          </span>
        </div>

        <div className="shrink-0">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5 leading-normal">Time</p>
          <p className="text-sm font-semibold text-slate-900 leading-normal">
            {job.installationDate || '—'}
            {job.startTime ? ` · ${job.startTime}` : ''}
            {job.endTime ? ` – ${job.endTime}` : ''}
          </p>
        </div>

        <div className="shrink-0">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5 leading-normal">Description</p>
          <p className="text-xs text-slate-700 leading-normal break-words">{jobDescription(job)}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <InitialsAvatar
            name={techName === 'Unassigned' ? null : techName}
            size={32}
            fontSize={11}
          />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium leading-none">Assigned to</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{techName}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-slate-500 leading-normal inline-flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Comments
          </p>
          <div className="flex flex-col gap-2 min-h-0 overflow-y-auto max-h-[180px] pr-0.5">
            {loadingComments && feed.length === 0 ? (
              <p className="text-xs text-slate-400">Loading comments…</p>
            ) : feed.length === 0 ? (
              <p className="text-xs text-slate-500 leading-normal border border-slate-200 rounded-md bg-slate-50 px-3 py-2.5">
                No comments yet.
              </p>
            ) : (
              feed.map((c) => (
                <div
                  key={c.id}
                  className="border border-slate-200 rounded-md bg-slate-50 px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <InitialsAvatar name={c.author} size={20} fontSize={8} />
                    <span className="text-[10px] font-bold text-slate-800 truncate leading-none">
                      {c.author}
                    </span>
                    {c.kind === 'activity' && (
                      <span className="text-[9px] text-slate-400 ml-auto shrink-0">Activity</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 leading-normal break-words pl-6">{c.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 pt-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-800 leading-normal">Add Comment</p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/30"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setCommentText('')}
              disabled={!commentText.trim() || postingComment}
              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void postComment()}
              disabled={!commentText.trim() || postingComment}
              className="px-3 py-1.5 rounded-md text-xs font-bold bg-ink text-white hover:bg-ink/90 disabled:opacity-40"
            >
              {postingComment ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-1 shrink-0">
          <button
            type="button"
            onClick={() => openJob(job)}
            className="flex-1 text-xs font-semibold py-2.5 rounded-md bg-ink text-white hover:bg-ink/90 leading-normal"
          >
            Open Job
          </button>
          <button
            type="button"
            onClick={() => openReschedule(job)}
            className="flex-1 text-xs font-semibold py-2.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 leading-normal"
          >
            Reschedule
          </button>
        </div>
      </aside>
    );
  };

  const KanbanColumns = ({
    columns,
    dropMode,
  }: {
    columns: { key: string; title: string; dotClass?: string; items: InstallationJob[] }[];
    dropMode?: 'team' | 'status' | null;
  }) => (
    <div className="flex gap-2 h-full min-h-0 w-full min-w-0 overflow-hidden">
      {columns.map((col) => {
        const zoneKey = `${dropMode || 'col'}:${col.key}`;
        const isOver = dragOverKey === zoneKey && !!draggedJobId;
        return (
          <div
            key={col.key}
            onDragOver={
              dropMode
                ? (e) => handleZoneDragOver(e, zoneKey)
                : undefined
            }
            onDragLeave={dropMode ? handleZoneDragLeave : undefined}
            onDrop={
              dropMode === 'team'
                ? (e) => dropOnTeam(e, col.key === 'unassigned' ? null : col.key)
                : dropMode === 'status'
                  ? (e) => dropOnStatus(e, col.key as MqStatus)
                  : undefined
            }
            className={`flex-1 basis-0 min-w-0 flex flex-col min-h-0 h-full bg-white border rounded-md p-2 transition-colors ${
              isOver ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2 px-0.5 shrink-0 min-w-0">
              {col.dotClass && <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotClass}`} />}
              <h3 className="text-xs font-bold text-slate-800 truncate min-w-0">{col.title}</h3>
              <span className="text-[10px] text-slate-400 ml-auto shrink-0">{col.items.length}</span>
            </div>
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
              {col.items.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
              {col.items.length === 0 && dropMode && draggedJobId && (
                <p className="text-[10px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded">
                  Drop here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const dateInputValue = formatDateString(currentDate);
  const selectedDateStr = dateInputValue;

  /** Override global input { h-9; px-3 } so text is never clipped */
  const toolbarControlStyle: React.CSSProperties = {
    height: 36,
    minHeight: 36,
    lineHeight: '36px',
    paddingTop: 0,
    paddingBottom: 0,
    boxSizing: 'border-box',
    fontSize: 12,
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-slate-200 bg-white pb-3 space-y-3">
        {/* Row 1: title · date · search · views */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-white">
          <h1 className="text-lg font-bold text-black shrink-0 leading-normal tracking-tight">
            Job Calendar
          </h1>

          <input
            type="date"
            value={dateInputValue}
            onChange={(e) => {
              const d = parseDateInput(e.target.value);
              if (d) setCurrentDate(d);
            }}
            style={{ ...toolbarControlStyle, width: 148, paddingLeft: 10, paddingRight: 10 }}
            className="shrink-0 rounded-md border border-slate-300 bg-white text-black font-semibold"
          />

          <div className="relative shrink-0">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (min 3 chars)"
              title="Search by job #, customer, technician, location, rego, status, or job type. Needs at least 3 characters."
              style={{ ...toolbarControlStyle, width: 190, paddingLeft: 12, paddingRight: 12 }}
              className="rounded-md border border-slate-300 bg-white text-black font-semibold placeholder:text-slate-400"
            />
            {searchPending && (
              <p className="absolute left-0 top-full mt-0.5 text-[10px] text-slate-500 whitespace-nowrap">
                Type {3 - searchQuery.length} more to search
              </p>
            )}
            {searchActive && (
              <p className="absolute left-0 top-full mt-0.5 text-[10px] text-ink whitespace-nowrap">
                Filtering by “{search.trim()}”
              </p>
            )}
          </div>

          <div className="flex flex-nowrap items-center gap-0.5 shrink-0 bg-white">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setCalendarView(v.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold leading-normal whitespace-nowrap transition-colors ${
                  calendarView === v.id
                    ? 'bg-ink text-white'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex flex-nowrap items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => shiftCurrentDate(-1)}
              className="rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-black hover:bg-slate-100 whitespace-nowrap"
              style={{ ...toolbarControlStyle, paddingLeft: 10, paddingRight: 10 }}
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-black hover:bg-slate-100 whitespace-nowrap"
              style={{ ...toolbarControlStyle, paddingLeft: 10, paddingRight: 10 }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftCurrentDate(1)}
              className="rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-black hover:bg-slate-100 whitespace-nowrap"
              style={{ ...toolbarControlStyle, paddingLeft: 10, paddingRight: 10 }}
            >
              Next ▶
            </button>
          </div>
        </div>

        {/* Row 2: legend (left) · filters (right) */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {MQ_STATUSES.map((s) => {
              const active = legendHighlight === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleLegendHighlight(s)}
                  title={active ? 'Clear highlight' : `Highlight ${s} jobs`}
                  className={`inline-flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5 text-xs leading-normal border transition-colors ${
                    active
                      ? 'border-slate-800 bg-slate-900 text-white font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${MQ_STYLE[s].dot}`} />
                  <span className="leading-none">{s}</span>
                </button>
              );
            })}
            {legendHighlight && (
              <button
                type="button"
                onClick={() => setLegendHighlight(null)}
                className="text-xs text-blue-600 font-medium shrink-0 hover:underline px-1"
              >
                Clear
              </button>
            )}
            <span className="text-[11px] text-slate-400 leading-normal shrink-0 pl-1">
              Click a status to highlight · Drag cards to move
            </span>
          </div>

          <div className="flex flex-nowrap items-center gap-2.5 shrink-0">
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              style={{ ...toolbarControlStyle, width: 128, paddingLeft: 10, paddingRight: 24 }}
              className="shrink-0 rounded-md border border-slate-300 bg-white text-slate-700"
            >
              <option value="All">Filter Team</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ ...toolbarControlStyle, width: 132, paddingLeft: 10, paddingRight: 24 }}
              className="shrink-0 rounded-md border border-slate-300 bg-white text-slate-700"
            >
              <option value="All">Filter Status</option>
              {MQ_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ ...toolbarControlStyle, width: 128, paddingLeft: 10, paddingRight: 24 }}
              className="shrink-0 rounded-md border border-slate-300 bg-white text-slate-700"
            >
              <option value="All">Filter Type</option>
              {MQ_JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={clearAll}
              disabled={!hasActiveFilters}
              title="Reset date, search, filters, and view to defaults"
              className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
              style={{ ...toolbarControlStyle, paddingLeft: 12, paddingRight: 12 }}
            >
              Clear all
            </button>
          </div>
        </div>

        {draggedJobId && (
          <p className="text-xs font-medium text-blue-700 leading-normal">
            Dragging {draggedJobId} — drop on a day, team, or status column
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 items-stretch flex-1 min-h-0 pt-3">
        <div className="flex-1 min-w-0 w-full min-h-0 flex flex-col">
          {calendarView === 'week' && (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white flex flex-col flex-1 min-h-0 h-full">
              <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
                {weekDays.map(({ date, dateStr }) => {
                  const isSelected = dateStr === selectedDateStr;
                  return (
                    <button
                      type="button"
                      key={dateStr}
                      onClick={() => setCurrentDate(new Date(`${dateStr}T00:00:00`))}
                      className={`px-1.5 py-2 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
                        isSelected ? 'bg-ink' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold whitespace-nowrap leading-normal px-0.5 ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 flex-1 min-h-0 gap-0">
                {weekDays.map(({ dateStr }) => {
                  const dayJobs = filteredJobs
                    .filter((j) => j.installationDate === dateStr)
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
                  const zoneKey = `date:${dateStr}`;
                  const isOver = dragOverKey === zoneKey && !!draggedJobId;
                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (didDragRef.current) return;
                        setCurrentDate(new Date(`${dateStr}T00:00:00`));
                      }}
                      onDragOver={(e) => handleZoneDragOver(e, zoneKey)}
                      onDragLeave={handleZoneDragLeave}
                      onDrop={(e) => dropOnDate(e, dateStr)}
                      className={`p-2.5 border-r border-slate-100 last:border-r-0 h-full min-h-0 overflow-y-auto transition-colors cursor-pointer ${
                        isOver ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-300' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-2.5 min-h-full">
                        {dayJobs.map((job) => (
                          <JobCard key={job.id} job={job} />
                        ))}
                        {dayJobs.length === 0 && isOver && (
                          <p className="text-[10px] text-blue-500 text-center py-6">Drop to move</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calendarView === 'day' && (
            <div className="border border-slate-200 rounded-md bg-white p-3 flex flex-col flex-1 min-h-0 h-full">
              <p className="text-sm font-bold text-slate-800 px-1 pb-2 border-b border-slate-100 shrink-0">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pt-3">
                {filteredJobs
                  .filter((j) => j.installationDate === formatDateString(currentDate))
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                  .map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                {filteredJobs.filter((j) => j.installationDate === formatDateString(currentDate))
                  .length === 0 && (
                  <p className="text-xs text-slate-400 py-10 text-center">No jobs for this day.</p>
                )}
              </div>
            </div>
          )}

          {calendarView === 'month' && (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white flex flex-col flex-1 min-h-0 h-full">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div
                    key={d}
                    className="text-center py-1.5 text-[10px] font-semibold text-slate-600 uppercase leading-normal"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 min-h-0 auto-rows-fr">
                {monthDays.map(({ date, dateStr, isCurrentMonth }) => {
                  const dayJobs = filteredJobs
                    .filter((j) => j.installationDate === dateStr)
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
                  const visible = dayJobs.slice(0, MONTH_VISIBLE_JOBS);
                  const zoneKey = `date:${dateStr}`;
                  const isOver = dragOverKey === zoneKey && !!draggedJobId;
                  const isSelected = dateStr === selectedDateStr;
                  const dayLabel = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (didDragRef.current) return;
                        setCurrentDate(new Date(`${dateStr}T00:00:00`));
                      }}
                      onDragOver={(e) => handleZoneDragOver(e, zoneKey)}
                      onDragLeave={handleZoneDragLeave}
                      onDrop={(e) => dropOnDate(e, dateStr)}
                      className={`min-h-0 p-1 border-r border-b border-slate-100 transition-colors flex flex-col cursor-pointer ${
                        isOver
                          ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300'
                          : isCurrentMonth
                            ? 'bg-white'
                            : 'bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 shrink-0 px-0.5">
                        <span
                          className={`inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-semibold leading-none ${
                            isSelected
                              ? 'bg-ink text-white'
                              : isCurrentMonth
                                ? 'text-slate-800'
                                : 'text-slate-400'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        <span
                          className={`text-[9px] leading-none ${
                            isSelected ? 'text-ink font-medium' : 'text-slate-400'
                          }`}
                        >
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      </div>
                      {/* Vertical stack: max 2 jobs, then "5+" opens modal with all */}
                      <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
                        {visible.map((job) => (
                          <MonthPill key={job.id} job={job} />
                        ))}
                        {dayJobs.length > MONTH_VISIBLE_JOBS && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setJobsListModal({
                                label: dayLabel,
                                jobs: dayJobs,
                              });
                            }}
                            className="w-full text-center text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded py-1 leading-none shrink-0 border border-blue-200 bg-blue-50/60"
                            title={`View all ${dayJobs.length} jobs`}
                          >
                            {dayJobs.length}+
                          </button>
                        )}
                        {dayJobs.length === 0 && isOver && (
                          <p className="w-full text-[10px] text-blue-500 text-center py-2">Drop to move</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calendarView === 'year' && (
            <div className="flex flex-col flex-1 min-h-0 h-full gap-2">
              <p className="text-sm font-bold text-black shrink-0 px-0.5">
                {currentDate.getFullYear()}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto content-start pb-1">
                {yearMonths.map((m) => {
                  const year = currentDate.getFullYear();
                  const prefix = `${year}-${String(m.month + 1).padStart(2, '0')}`;
                  const dateStr = `${prefix}-01`;
                  const zoneKey = `date:${dateStr}`;
                  const isOver = dragOverKey === zoneKey && !!draggedJobId;
                  const monthJobs = filteredJobs
                    .filter((j) => j.installationDate?.startsWith(prefix))
                    .sort((a, b) => {
                      const d = (a.installationDate || '').localeCompare(b.installationDate || '');
                      if (d !== 0) return d;
                      return (a.startTime || '').localeCompare(b.startTime || '');
                    });
                  const visible = monthJobs.slice(0, YEAR_VISIBLE_JOBS);
                  const extra = monthJobs.length - visible.length;
                  return (
                    <div
                      key={m.month}
                      onDragOver={(e) => handleZoneDragOver(e, zoneKey)}
                      onDragLeave={handleZoneDragLeave}
                      onDrop={(e) => dropOnDate(e, dateStr)}
                      className={`border rounded-lg bg-white p-3 min-h-[140px] flex flex-col transition-colors ${
                        isOver ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDate(new Date(year, m.month, 1));
                          setCalendarView('month');
                        }}
                        className="text-left text-sm font-bold text-black hover:text-ink shrink-0 mb-2"
                      >
                        {m.name}
                      </button>

                      {monthJobs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 mt-1">No jobs</p>
                      ) : (
                        <div className="flex flex-col gap-1.5 min-h-0 flex-1">
                          {visible.map((job) => {
                            const mq = toMqStatus(job.status);
                            const style = MQ_STYLE[mq];
                            const jt = toMqJobType(job);
                            const label =
                              job.customerName?.trim() ||
                              `${jt} #${jobNumber(job)}`;
                            return (
                              <button
                                key={job.id}
                                type="button"
                                draggable
                                onDragStart={(e) => handleCardDragStart(e, job.id)}
                                onDragEnd={handleCardDragEnd}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (didDragRef.current) return;
                                  selectJob(job);
                                }}
                                title={`${formatMonthDay(job.installationDate)} · ${jt} · ${label}`}
                                className={`w-full text-left rounded-md border px-2 py-1.5 flex items-center gap-1.5 min-w-0 transition-all cursor-grab active:cursor-grabbing ${style.bg} ${style.border} ${
                                  selectedJob?.id === job.id
                                    ? 'ring-2 ring-ink ring-offset-1'
                                    : cardEmphasis(mq)
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                                />
                                <span
                                  className={`text-[10px] font-bold tabular-nums shrink-0 ${style.text}`}
                                >
                                  {formatMonthDay(job.installationDate)}
                                </span>
                                <span className={`shrink-0 ${style.text}`}>
                                  <JobTypeIcon type={jt} className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-[11px] font-semibold text-slate-800 truncate min-w-0">
                                  {label}
                                </span>
                              </button>
                            );
                          })}
                          {extra > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setJobsListModal({
                                  label: `${m.name} ${year}`,
                                  jobs: monthJobs,
                                  groupByDay: true,
                                  monthIndex: m.month,
                                  year,
                                })
                              }
                              className="text-[11px] font-bold text-ink hover:underline text-left px-0.5 pt-0.5"
                            >
                              +{extra} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calendarView === 'team' && (
            <div className="flex-1 min-h-0 h-full">
              <KanbanColumns
                dropMode="team"
                columns={[
                  {
                    key: 'unassigned',
                    title: 'Unassigned',
                    items: filteredJobs.filter((j) => !j.technicianId),
                  },
                  ...technicians.map((t) => ({
                    key: t.id,
                    title: t.displayName,
                    items: filteredJobs.filter((j) => j.technicianId === t.id),
                  })),
                ]}
              />
            </div>
          )}

          {calendarView === 'byStatus' && (
            <div className="flex-1 min-h-0 h-full">
              <KanbanColumns
                dropMode="status"
                columns={MQ_STATUSES.map((s) => ({
                  key: s,
                  title: s,
                  dotClass: MQ_STYLE[s].dot,
                  items: filteredJobs.filter((j) => toMqStatus(j.status) === s),
                }))}
              />
            </div>
          )}

          {calendarView === 'byJobType' && (
            <div className="flex-1 min-h-0 h-full">
              <KanbanColumns
                columns={MQ_JOB_TYPES.map((t) => ({
                  key: t,
                  title: t,
                  items: filteredJobs.filter((j) => toMqJobType(j) === t),
                }))}
              />
            </div>
          )}
        </div>

        <DetailSidebar />
      </div>

      {rescheduleJobTarget && (
        <RescheduleDialog
          job={rescheduleJobTarget}
          isOpen={!!rescheduleJobTarget}
          targetDate={rescheduleTargets.date}
          targetStartTime={rescheduleTargets.start}
          targetEndTime={rescheduleTargets.end}
          onClose={() => {
            setRescheduleJobTarget(null);
            setRescheduleTargets({});
          }}
          onSuccess={(jobId, newDate, newStartTime, newEndTime) => {
            setSelectedJob((prev) =>
              prev?.id === jobId
                ? {
                    ...prev,
                    installationDate: newDate,
                    startTime: newStartTime,
                    endTime: newEndTime,
                  }
                : prev
            );
          }}
        />
      )}

      <JobsListModal />
    </div>
  );
};
