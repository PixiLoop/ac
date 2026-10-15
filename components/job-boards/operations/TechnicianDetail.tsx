import React, { useState } from 'react';
import { Technician } from '../types/installation';
import { useOperations } from '../../../providers/OperationsContext';
import { TechnicianStatusBadge, StatusBadge } from './shared/StatusBadge';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TechnicianDetailProps {
  technician: Technician;
  onBack: () => void;
}

export const TechnicianDetail: React.FC<TechnicianDetailProps> = ({
  technician,
  onBack,
}) => {
  const router = useRouter()
  const { jobs, setSelectedJobId, getTechnicianWorkload } = useOperations();
  const [activeTab, setActiveTab] = useState<'timeline' | 'assignments' | 'upcoming' | 'completed'>('timeline');

  const workload = getTechnicianWorkload(technician.id);
  const techJobs = jobs.filter((j) => j.technicianId === technician.id);

  // Today's jobs for the vertical timeline (Requirement #36)
  const todayJobs = techJobs
    .filter((j) => j.installationDate === '2026-10-05')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Upcoming jobs (after 2026-10-05)
  const upcomingJobs = techJobs
    .filter((j) => j.installationDate && j.installationDate > '2026-10-05')
    .sort((a, b) => (a.installationDate || '').localeCompare(b.installationDate || ''));

  // Completed jobs
  const completedJobs = techJobs.filter(
    (j) => j.status === 'Completed' || j.status === 'Invoiced' || j.status === 'Installed'
  );

  return (
    <div className="space-y-6 mx-auto pb-12 animate-in fade-in duration-200">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Technicians List
        </button>
      </div>

      {/* 1. Technician Profile Header (Requirement #11) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0 overflow-hidden">
              {technician.displayName.slice(0, 2)}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{technician.displayName}</h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {technician.id}
                </span>
                <TechnicianStatusBadge status={technician.status} />
              </div>

              <p className="text-sm font-medium text-slate-600 mt-0.5">
               Technician
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                {/* <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {technician.depot}
                </span> */}
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {technician.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {technician.phone}
                </span>
              </div>
            </div>
          </div>

          {/* <div className="flex flex-wrap items-center gap-2">
            {technician.certifications.map((cert) => (
              <span
                key={cert}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                {cert}
              </span>
            ))}
          </div> */}
        </div>
      </div>

      {/* 2. Technician Workload Summary (Requirement #11 & #12) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Today's Jobs
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-blue-600">
              {workload.today}
            </span>
            <span className="text-xs text-slate-400">active today</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            This Week
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900">
              {workload.thisWeek}
            </span>
            <span className="text-xs text-slate-400">installations</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Completed
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-emerald-600">
              {workload.completed}
            </span>
            <span className="text-xs text-slate-400">lifetime</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Pending / In-Progress
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-amber-600">
              {workload.pending}
            </span>
            <span className="text-xs text-slate-400">queue</span>
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'timeline'
              ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Today's Schedule Timeline ({todayJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'upcoming'
              ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming Schedule ({upcomingJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'completed'
              ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed Jobs ({completedJobs.length})
        </button>
      </div>

      {/* 3. Today's Schedule (Vertical Timeline) — Requirement #36 */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Today's Schedule</h3>
            <p className="text-xs text-slate-500">
              Chronological job sequence for Monday, 5 Oct 2026.
            </p>
          </div>

          {todayJobs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No installations booked for this technician today.
            </div>
          ) : (
            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200">
              {todayJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/job-boards/job/${job.id}`)}
                  className="relative group cursor-pointer"
                >
                  {/* Timeline Dot */}
                  <span className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-blue-600 border-4 border-white shadow-xs flex items-center justify-center text-white text-[10px] font-bold" />

                  <div className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                          {job.startTime}
                        </span>
                        <span className="font-mono font-bold text-slate-900">{job.id}</span>
                        <StatusBadge status={job.status} />
                      </div>

                      <div className="text-xs text-blue-600 font-semibold flex items-center group-hover:translate-x-1 transition-transform">
                        View Job Details
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 mt-2">
                      {job.customerName}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.location}
                      </span>
                      <span>
                        Vehicle: {job.vehicle.rego} ({job.vehicle.makeModel})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Schedule */}
      {activeTab === 'upcoming' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Upcoming Installations</h3>
          </div>
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Job</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No upcoming installations booked.
                  </td>
                </tr>
              ) : (
                upcomingJobs.map((j) => (
                  <tr
                    key={j.id}
                   onClick={() => router.push(`/job-boards/job/${j.id}`)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{j.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{j.customerName}</td>
                    <td className="py-3 px-4">
                      {j.installationDate} ({j.startTime} – {j.endTime})
                    </td>
                    <td className="py-3 px-4">{j.location}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                      Details →
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Completed Jobs */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Recently Completed Installations</h3>
          </div>
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Job</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date Completed</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedJobs.map((j) => (
                <tr
                  key={j.id}
                  onClick={() => router.push(`/job-boards/job/${j.id}`)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{j.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{j.customerName}</td>
                  <td className="py-3 px-4">{j.installationDate || 'Recent'}</td>
                  <td className="py-3 px-4 font-mono">{j.vehicle.rego}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                    Review →
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
