import React, { useState } from 'react';
import { Project, InstallationStatus } from '../types/installation';
import { useOperations } from '../../../providers/OperationsContext';
import { StatusBadge, ScheduleBadge } from './shared/StatusBadge';
import { ChecklistProgress } from './shared/ChecklistProgress';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectScheduleTabProps {
  project: Project;
}

export const ProjectScheduleTab: React.FC<ProjectScheduleTabProps> = ({ project }) => {
  const router = useRouter()
  const { jobs, technicians, setSelectedJobId, getChecklistStats } = useOperations();

  const [techFilter, setTechFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<InstallationStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<string>('');

  const projectJobs = jobs.filter((j) => j.projectId === project.id);

  const filteredJobs = projectJobs.filter((job) => {
    if (techFilter !== 'All' && job.technicianId !== techFilter) return false;
    if (statusFilter !== 'All' && job.status !== statusFilter) return false;
    if (dateFilter && job.installationDate !== dateFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Project Schedule Filters (Requirement #37) */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Filter by Technician
          </label>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Not Actioned">Not Actioned</option>
            <option value="Workshop Setup">Workshop Setup</option>
            <option value="Waiting Install">Waiting Install</option>
            <option value="Installed">Installed</option>
            <option value="Invoiced">Invoiced</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Filter by Date
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Project Schedule Table (Requirement #37) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Job</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Checklist</th>
                <th className="py-3 px-4">Schedule Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No jobs match the project schedule filters.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const stats = getChecklistStats(job);

                  return (
                    <tr
                      key={job.id}
                      onClick={() => router.push(`/job-boards/job/${job.id}`)}
                      className="hover:bg-slate-50 cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600">
                        {job.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 truncate max-w-[140px]">
                        {job.customerName}
                      </td>
                      <td className="py-3 px-4 truncate max-w-[160px]">{job.location}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {job.technicianName || <span className="text-amber-600 italic">Unassigned</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4">{job.installationDate || '—'}</td>
                      <td className="py-3 px-4">
                        {job.startTime && job.endTime ? `${job.startTime} – ${job.endTime}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-4 min-w-[120px]">
                        <ChecklistProgress stats={stats} compact={true} />
                      </td>
                      <td className="py-3 px-4">
                        <ScheduleBadge isScheduled={job.isScheduled} />
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                        View →
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
