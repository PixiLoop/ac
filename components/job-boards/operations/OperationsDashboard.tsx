import React, { useState } from 'react';
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
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const OperationsDashboard: React.FC = () => {
  const router = useRouter()
  const {
    jobs,
    technicians,
    setSelectedJobId,
    setActiveNavTab,
    getChecklistStats,
  } = useOperations();

  const [schedulingJob, setSchedulingJob] = useState<InstallationJob | null>(null);

  // Today is 2026-10-05 in mock data
  const todayDate = '2026-10-05';

  // Today's Installations (Requirement #35)
  const todayJobs = jobs
    .filter((j) => j.installationDate === todayDate)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Unscheduled jobs
  const unscheduledJobs = jobs.filter((j) => !j.isScheduled);

  // Status statistics
  const waitingInstallCount = jobs.filter((j) => j.status === 'Waiting Install').length;
  const installedCount = jobs.filter((j) => j.status === 'Installed').length;
  const workshopCount = jobs.filter((j) => j.status === 'Workshop Setup').length;

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Installation Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of fleet installations, today's fitting appointments, and technician allocation.
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Today's Installations
            </span>
            <CalendarCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">
              {todayJobs.length}
            </span>
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
            <span className="text-3xl font-extrabold text-slate-900">
              {waitingInstallCount}
            </span>
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
            <span className="text-3xl font-extrabold text-emerald-600">
              {installedCount}
            </span>
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
            <span className="text-3xl font-extrabold text-rose-600">
              {unscheduledJobs.length}
            </span>
            <span className="text-xs text-slate-400">needs technician</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Installations & Technician Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Today's Schedule (Requirement #35) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today’s Installations</h2>
              <p className="text-xs text-slate-500">
                Scheduled telematics installations for Monday, 5 October 2026.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {todayJobs.length} Bookings
            </span>
          </div>

          <div className="space-y-3">
            {todayJobs.map((job) => {
              const stats = getChecklistStats(job);

              return (
                <div
                  key={job.id}
                  onClick={() => router.push(`/job-boards/job/${job.id}`)}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs group"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Time block */}
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

                  {/* Right side: Checklist progress & CTA */}
                  <div className="sm:text-right shrink-0 min-w-[140px] pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <ChecklistProgress stats={stats} compact={true} />
                    <span className="text-[11px] text-blue-600 font-semibold group-hover:translate-x-1 inline-flex items-center gap-0.5 mt-2 transition-transform">
                      Open Job <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right (1 col): Technician Availability & Unscheduled Queue */}
        <div className="space-y-6">
          {/* Unscheduled Queue */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Unscheduled Queue
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {unscheduledJobs.length} Jobs
              </span>
            </div>

            <div className="space-y-2.5">
              {unscheduledJobs.slice(0, 3).map((job) => (
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
              ))}
            </div>
          </div>

          {/* Technician quick roster */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Technician Roster</h3>
              <button
                onClick={() => setActiveNavTab('technicians')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {technicians.slice(0, 5).map((tech) => (
                <div
                  key={tech.id}
                  onClick={() => {
                    setActiveNavTab('technicians');
                  }}
                  className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center overflow-hidden">
                      {tech.displayName.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{tech.displayName}</p>
                      {/* <p className="text-[10px] text-slate-400">{tech.depot}</p> */}
                    </div>
                  </div>
                  <TechnicianStatusBadge status={tech.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
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
