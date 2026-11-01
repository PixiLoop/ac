import React, { useMemo, useState } from 'react';
import { InstallationJob } from '../types/installation';
import { useOperations } from '../../../providers/OperationsContext';
import { StatusBadge, ScheduleBadge, TechnicianStatusBadge } from './shared/StatusBadge';
import { ChecklistProgress } from './shared/ChecklistProgress';
import { ScheduleJobDialog } from './ScheduleJobDialog';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const OperationsDashboard: React.FC = () => {
  const router = useRouter();
  const {
    jobs,
    technicians,
    setActiveNavTab,
    getChecklistStats,
  } = useOperations();

  const [schedulingJob, setSchedulingJob] = useState<InstallationJob | null>(null);

  const todayDate = useMemo(() => todayISO(), []);
  const todayLabel = useMemo(
    () =>
      new Date(`${todayDate}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [todayDate]
  );

  const todayJobs = jobs
    .filter((j) => j.installationDate === todayDate)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const unscheduledJobs = jobs.filter((j) => !j.isScheduled);

  const waitingInstallCount = jobs.filter((j) => j.status === 'Waiting Install').length;
  const installedCount = jobs.filter((j) => j.status === 'Installed').length;

  return (
    <div className="w-full max-w-none h-full min-h-0 flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Installation Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of fleet installations, today&apos;s fitting appointments, and technician
            allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveNavTab('calendar')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            Open Calendar
          </button>
          <button
            onClick={() => setActiveNavTab('installations')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            View All Jobs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Today&apos;s Installations
            </span>
            <CalendarCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{todayJobs.length}</span>
            <span className="text-xs text-slate-400">fittings scheduled</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Waiting Installation
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{waitingInstallCount}</span>
            <span className="text-xs text-slate-400">ready on site</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Installed / Ready to Invoice
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{installedCount}</span>
            <span className="text-xs text-slate-400">billable</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Unscheduled Queue
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">{unscheduledJobs.length}</span>
            <span className="text-xs text-slate-400">needs technician</span>
          </div>
        </div>
      </div>

      {/* Main Grid — fills remaining viewport height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left: Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col min-h-0 h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Installations</h2>
              <p className="text-xs text-slate-500">
                Scheduled telematics installations for {todayLabel}.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {todayJobs.length} Bookings
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-4 pr-1">
            {todayJobs.length === 0 ? (
              <div className="h-full min-h-[200px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                <p className="text-xs text-slate-400 text-center px-4">
                  No installations scheduled for today.
                </p>
              </div>
            ) : (
              todayJobs.map((job) => {
                const stats = getChecklistStats(job);

                return (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/job-boards/job/${job.id}`)}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-center shrink-0 min-w-[80px]">
                        <span className="block font-mono text-sm font-bold text-blue-600">
                          {job.startTime}
                        </span>
                        <span className="block font-mono text-[10px] text-slate-400">
                          {job.endTime}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {job.id}
                          </span>
                          <StatusBadge status={job.status} />
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                          {job.customerName}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {job.technicianName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 min-w-[140px] pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <ChecklistProgress stats={stats} compact={true} />
                      <span className="text-[11px] text-blue-600 font-semibold group-hover:translate-x-1 inline-flex items-center gap-0.5 mt-2 transition-transform">
                        Open Job <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Unscheduled + Roster */}
        <div className="flex flex-col gap-4 min-h-0 h-full">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col min-h-0 max-h-[40%] shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Unscheduled Queue
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {unscheduledJobs.length} Jobs
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto min-h-0 flex-1 pt-3 pr-0.5">
              {unscheduledJobs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Queue is empty.</p>
              ) : (
                unscheduledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{job.id}</span>
                      <ScheduleBadge isScheduled={false} />
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{job.customerName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{job.location}</p>

                    <button
                      onClick={() => setSchedulingJob(job)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Schedule Now
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Technician Roster</h3>
              <button
                onClick={() => setActiveNavTab('technicians')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto min-h-0 flex-1 pt-3 pr-0.5">
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  onClick={() => {
                    setActiveNavTab('technicians');
                  }}
                  className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                      {tech.displayName.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{tech.displayName}</p>
                    </div>
                  </div>
                  <TechnicianStatusBadge status={tech.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {schedulingJob && (
        <ScheduleJobDialog
          job={schedulingJob}
          isOpen={!!schedulingJob}
          onClose={() => setSchedulingJob(null)}
        />
      )}
    </div>
  );
};
