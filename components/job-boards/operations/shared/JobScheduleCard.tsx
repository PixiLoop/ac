import React from 'react';
import { InstallationJob } from '../../types/installation';
import { StatusBadge, ScheduleBadge } from './StatusBadge';
import { ChecklistProgress } from './ChecklistProgress';
import { MapPin, User, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useOperations } from '../../../../providers/OperationsContext';
import { useRouter } from 'next/navigation';

interface JobScheduleCardProps {
  job: InstallationJob;
  onClick?: () => void;
  onScheduleClick?: () => void;
  className?: string;
}

export const JobScheduleCard: React.FC<JobScheduleCardProps> = ({
  job,
  onClick,
  onScheduleClick,
  className = '',
}) => {
  const router = useRouter()
  const { getChecklistStats, setSelectedJobId } = useOperations();
  const stats = getChecklistStats(job);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/job-boards/job/${job.id}`)
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group bg-white rounded-xl border border-slate-200/90 hover:border-blue-400/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Top Accent line based on status */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${job.status === 'Completed'
            ? 'bg-teal-500'
            : job.status === 'Installed'
              ? 'bg-emerald-500'
              : job.status === 'Waiting Install'
                ? 'bg-blue-500'
                : job.status === 'Workshop Setup'
                  ? 'bg-amber-500'
                  : 'bg-slate-300'
          }`}
      />

      <div>
        {/* Header: Job ID + Status Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {job.id}
              </span>
              <ScheduleBadge isScheduled={job.isScheduled} />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 mt-0.5">
              {job.customerName}
            </h4>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* Location & Vehicle */}
        <div className="space-y-1.5 my-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700 truncate">
              {job.technicianName || (
                <span className="text-amber-600 italic">Unassigned Technician</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{job.installationDate ? job.installationDate : 'Not Scheduled'}</span>
            </div>
            {job.startTime && job.endTime && (
              <div className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {job.startTime} – {job.endTime}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hardware tags preview */}
        <div className="flex flex-wrap gap-1 mb-3">
          {job.hardware.slice(0, 3).map((hw) => (
            <span
              key={hw.id}
              className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
            >
              {hw.model}
            </span>
          ))}
          {job.hardware.length > 3 && (
            <span className="text-[10px] font-medium bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">
              +{job.hardware.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Checklist progress */}
      <div className="pt-2 border-t border-slate-100">
        <ChecklistProgress stats={stats} compact={true} />

        <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-500">
          <span>{job.vehicle.rego} • {job.vehicle.fleetNumber}</span>
          <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform">
            Details
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
